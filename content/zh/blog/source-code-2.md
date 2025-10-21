+++
title = "Volcano 源码分析（二）"
description = "Volcano 源码分析（二）"
subtitle = ""

date = 2024-01-03
lastmod = 2024-01-03
datemonth = "Jan"
dateyear = "2024"
dateday = 3

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["Daniel Hu - 胡说云原生"]

tags = ["Tutorials"]
summary = "Volcano 源码分析（二）"

# Add menu entry to sidebar.
linktitle = "Volcano 源码分析（二）"
[menu.posts]
parent = "tutorials"
weight = 14
+++

{{<figure library="1" src="source-code-2-banner.jpeg">}}

> - 本文首发于微信公众号“**胡说云原生**”；
> - 作者：[Daniel Hu](https://www.danielhu.cn/about/)
> - 原文链接：[Volcano 源码分析（二）](https://www.danielhu.cn/volcano-source-code-2/)；

## 0. 总结前置

你也可以选择直接跳到[1. 概述](#1-概述)开始阅读。

> 今天我们先顺着 **Volcano Scheduler** 部分的代码找到了 `PodGroup` 的处理逻辑，看到了 Scheduler 拿到 PodGroup 后会组装 JobInfo 对象；拿到 Pod 后会组装 TaskInfo 对象（这里根据 Pod 的注解中指定的 PodGroup 名字来将 TaskInfo 和 JobInfo 关联，也就是 Pod 和 PodGroup 的关联。
>
> 接着我们又从 **Volcano Controller**（Job Controller）中找到了 `PodGroup` 和 `Pod` 的创建逻辑。在 Job 对象创建后，控制器会根据 Job 的信息创建一个唯一对应的 PodGroup，然后根据 Job 中的 Tasks 信息创建一系列的 pods，这些 pods 会带上 PodGroup 名字（在注解里）
>
> 至此，我们知道了 Volcano 中调度器和控制器的职责分层，进一步也就能够理解 Volcano 如何和 kubeflow 等其他框架结合完成复杂任务的批调度过程了。（上层框架创建 PodGroup 和 Pods，Volcano 根据 PodGroup 信息和 Pods 注解信息完成批调度过程。

## 1. 概述

话接上回，在[《Volcano 原理、源码分析（一）》](https://www.danielhu.cn/volcano-source-code-1/)中我们聊到了 `Volcano` Scheduler 部分的主要工作逻辑，发现 Volcano Scheduler 是围绕了 Job 和 Job 里面的 Tasks 在调度。但是理论上 Volcano Scheduler 应该以 `PodGroup` 为基础单元执行调度逻辑，这里的 gap 出现在哪里呢？

后来在文末我提到了 Scheduler 部分的 Job 就是 PodGroup wrapper，Task 就是 Pod wrapper，这样逻辑上才说得通。今天我准备接着这条路，**分析 PodGroup 的“调谐”逻辑**。

## 2. 寻找调度器中的 PodGroup

根据经验（其实我也没有啥 Volcano 的经验，不过早几年看过不少 K8s 里的控制器和调度器相关代码，Volcano 既然在 K8s 体系内抽象控制器和调度器，那实现逻辑就应该类似），**Volcano 的控制器部分应该负责根据 Job 资源配置来创建相应的 PodGroup 资源对象实例，然后调度器部分应该通过相应的 Informer 能力拿到 PodGroup 资源对象实例创建事件，接着进行相应的调度逻辑。**（盲猜的，接着从代码里顺着这个思路看能不能找到相应逻辑。）

### 2.1 从 PodGroup 到 JobInfo 的封装

在 `pkg/scheduler` 目录内搜 `PodGroup` 相关代码，一个 PodGroup 相关的 `EventHandler` 逻辑出现在我眼前。K8s 自定义控制器开发的主要工作之一就是定义 **“Resource Event Handlers”**。

- `pkg/scheduler/cache/cache.go:669`

```go
sc.podGroupInformerV1beta1.Informer().AddEventHandler(
    cache.FilteringResourceEventHandler{
        FilterFunc: func(obj interface{}) bool {
            var pg *vcv1beta1.PodGroup
            switch v := obj.(type) {
            case *vcv1beta1.PodGroup:
                pg = v
            // ......

            return responsibleForPodGroup(pg, mySchedulerPodName, c)
        },
        Handler: cache.ResourceEventHandlerFuncs{
            AddFunc:    sc.AddPodGroupV1beta1,
            UpdateFunc: sc.UpdatePodGroupV1beta1,
            DeleteFunc: sc.DeletePodGroupV1beta1,
        },
    })
```

顺着这里的代码接着看 `AddPodGroupV1beta1` 方法的实现：

- `pkg/scheduler/cache/event_handlers.go:707`

```go
func (sc *SchedulerCache) AddPodGroupV1beta1(obj interface{}) {
	ss, ok := obj.(*schedulingv1beta1.PodGroup)
	// ......

	podgroup := scheduling.PodGroup{}
	if err := scheme.Scheme.Convert(ss, &podgroup, nil); err != nil {
		klog.Errorf("Failed to convert podgroup from %T to %T", ss, podgroup)
		return
	}

	pg := &schedulingapi.PodGroup{PodGroup: podgroup, Version: schedulingapi.PodGroupVersionV1Beta1}
	// ......

	if err := sc.setPodGroup(pg); err != nil {
		klog.Errorf("Failed to add PodGroup %s into cache: %v", ss.Name, err)
		return
	}
}
```

这里定义了一个 PodGroup 类型（不是 CRD 里的 PodGroup）：

```go
type PodGroup struct {
	scheduling.PodGroup
	Version string
}
```

然后将这个包含 CR PodGroup + Version 的 pg 传给了 `sc.setPodGroup(pg)` 方法。sc 的类型是 `*SchedulerCache`。

接着来看 `setPodGroup` 方法的实现：

- `pkg/scheduler/cache/event_handlers.go:668`

```go
func (sc *SchedulerCache) setPodGroup(ss *schedulingapi.PodGroup) error {
    // 这里的 job 是一个字符串，内容是 PodGroup 的 namespace/name
	job := getJobID(ss)
	if _, found := sc.Jobs[job]; !found {
        // Jobs 这个 map 的 key 就是 pg 的 namespace/name，value 是一个新的类型 *JobInfo
		sc.Jobs[job] = schedulingapi.NewJobInfo(job)
	}

    // 这里存的 *JobInfo 类型的 Job 中很多属性都来自于 ss 这个 pg
	sc.Jobs[job].SetPodGroup(ss)

	// ......
	return nil
}
```

到这里，PodGroup 的信息就被转存到了 JobInfo 中，JobInfo 也就对应一个 PodGroup 在 Scheduler 内的 wrapper。

### 2.2 从 Pod 到 TaskInfo 的封装

PodGroup 这个 CR 中其实不包含 Pod 的具体信息。在 PodGroup 的 Spec 定义中，我们可以看到如下字段：

- `volcano.sh/apis@v1.8.0/pkg/apis/scheduling/types.go:166`

```go
type PodGroupSpec struct {
	MinMember int32
	MinTaskMember map[string]int32
	Queue string
	PriorityClassName string
	MinResources *v1.ResourceList
}
```

换言之，通过 PodGroup 资源对象实例其实找不到相应的 pods 信息，也就是说 spec 里没有类似 Pods 这样的字段。那么 Pod 和 PodGroup 如何关联呢？既然没有直接绑定，那么 Pod 中就一定会保存 PodGroup 的信息，比如通过在 Pod 的 annotation 中保存所属 PodGroup 的 id 之类的方式，然后在处理 Pod 变更事件对应的控制逻辑中完成 Pod 和 PodGroup 的关联过程。

好，下一步理所当然看一下当 Pod 相关的 events 产生的时候，Scheduler 里相应的 handlers 是什么。

- `pkg/scheduler/cache/cache.go:616`

```go
sc.podInformer.Informer().AddEventHandler(
    cache.FilteringResourceEventHandler{
        FilterFunc: func(obj interface{}) bool {
            switch v := obj.(type) {
            case *v1.Pod:
                if !responsibleForPod(v, schedulerNames, mySchedulerPodName, c) {
                    if len(v.Spec.NodeName) == 0 {
                        return false
                    }
                    if !responsibleForNode(v.Spec.NodeName, mySchedulerPodName, c) {
                        return false
                    }
                }
                return true
            // ......
        },
        Handler: cache.ResourceEventHandlerFuncs{
            AddFunc:    sc.AddPod,
            UpdateFunc: sc.UpdatePod,
            DeleteFunc: sc.DeletePod,
        },
    })
```

在 Filter 过程中，主要是根据 `pod.Spec.SchedulerName` 来判断这个 Pod 是不是应该被当前调度器调度。顺着继续看 AddPod 方法的实现：

- `pkg/scheduler/cache/event_handlers.go:362`

```go
func (sc *SchedulerCache) AddPod(obj interface{}) {
	pod, ok := obj.(*v1.Pod)
	// ......

	err := sc.addPod(pod)
	// ......
}
```

再看 addPod 方法：

- `pkg/scheduler/cache/event_handlers.go:237`

```go
func (sc *SchedulerCache) addPod(pod *v1.Pod) error {
	pi, err := sc.NewTaskInfo(pod)
	// ......

	return sc.addTask(pi)
}
```

这里干了2件事：

1. 先拿着 pod 信息创建一个 `*TaskInfo` 类型的 pi，这里的 TaskInfo 也就是一个 Pod 信息的 wrapper，和前面的 JobInfo 封装 PodGroup 逻辑非常接近。
2. SchedulerCache 的 addTask 方法将 TaskInfo 加到 JobInfo.Tasks 属性中。这里的 Tasks 类型是 `map[TaskID]*TaskInfo`。

另外还需要关注 `NewTaskInfo` 方法里的一个细节：

- `pkg/scheduler/cache/event_handlers.go:226`

```go
func (sc *SchedulerCache) NewTaskInfo(pod *v1.Pod) (*schedulingapi.TaskInfo, error) {
	taskInfo := schedulingapi.NewTaskInfo(pod)
	// ......
	return taskInfo, nil
}
```

这里调用了 `schedulingapi.NewTaskInfo(pod)`，继续往里：

- `pkg/scheduler/api/job_info.go:162`

```go
func NewTaskInfo(pod *v1.Pod) *TaskInfo {
	initResReq := GetPodResourceRequest(pod)
	resReq := initResReq
	bestEffort := initResReq.IsEmpty()
	preemptable := GetPodPreemptable(pod)
	revocableZone := GetPodRevocableZone(pod)
	topologyInfo := GetPodTopologyInfo(pod)

	jobID := getJobID(pod)

	ti := &TaskInfo{
		UID:           TaskID(pod.UID),
		Job:           jobID,
		Name:          pod.Name,
		Namespace:     pod.Namespace,
		Priority:      1,
		Pod:           pod,
		Resreq:        resReq,
		InitResreq:    initResReq,
		// ......
	}

	// ......

	return ti
}
```

注意到这里设置了一个 jobID 到 TaskInfo 里，而这个 `getJobID()` 方法的实现就很有意思了：

- `pkg/scheduler/api/job_info.go:141`

```go
func getJobID(pod *v1.Pod) JobID {
	if gn, found := pod.Annotations[v1beta1.KubeGroupNameAnnotationKey]; found && len(gn) != 0 {
		// Make sure Pod and PodGroup belong to the same namespace.
		jobID := fmt.Sprintf("%s/%s", pod.Namespace, gn)
		return JobID(jobID)
	}

	return ""
}
```

这里尝试从 pod 中寻找 key 为 "`scheduling.k8s.io/group-name`" 的 annotation，假如这个 value 是 pg1，那么 JobID 就是 "pod-namespace/pg1"，其实也就是 PodGroup 的标识。于是到这里，表示 Pod 的 TaskInfo 也就关联上了表示 PodGroup 的 TaskInfo。

## 3. 控制器中 PodGroup 和 Pod 的创建逻辑

到这里，我们知道了 Scheduler 中是如何处理 PodGroup 和 Pod，将其转换成 jobs 和 job.tasks 然后进一步执行调度逻辑的。那么控制器层面是如何创建 PodGroup 和 Pod 的呢？

在 Volcano 中有一个自定义资源 Job，按理说这个 Job 类型的资源对象被创建后，相应的 Controller 应该负责完成 Job 对应的 PodGroup 和 pods 的创建，并且打上合适的 annotation。同理其他框架，比如 kubeflow 里的 operator 也应该是类似的逻辑，负责创建 PodGroup 以及 pods（也可能只创建 pods），然后和 Volcano Scheduler 协作完成批调度流程。

总之，接着先看下 Volcano 中的控制器部分是如何倒腾 PodGroup 和 Pod 的。

### 3.1 从 main 开始寻找 SyncJob 的踪迹

接着我们从主函数入手，寻找当 Job 被创建后，Controller 对应的 worker 逻辑。

- `cmd/controller-manager/main.go:45`

```go
func main() {
	// ......

	if err := app.Run(s); err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
}
```

这里的主要逻辑就是调用 `Run()` 方法，在 Run() 方法内有一个 `startControllers(config, opt)` 调用，startControllers(config, opt) 方法内又有一个 `c.Run(ctx.Done())` 调用，这几层函数基本都是框架性质的逻辑，这里不赘述。

`c.Run(ctx.Done())` 方法对应的 JobController 的启动方法是：

- `pkg/controllers/job/job_controller.go:238`

```go
func (cc *jobcontroller) Run(stopCh <-chan struct{}) {
	cc.informerFactory.Start(stopCh)
	cc.vcInformerFactory.Start(stopCh)

	// ......

	go wait.Until(cc.handleCommands, 0, stopCh)
	var i uint32
	for i = 0; i < cc.workers; i++ {
		go func(num uint32) {
			wait.Until(
				func() {
					cc.worker(num)
				},
				time.Second,
				stopCh)
		}(i)
	}

	go cc.cache.Run(stopCh)

	// Re-sync error tasks.
	go wait.Until(cc.processResyncTask, 0, stopCh)

	klog.Infof("JobController is running ...... ")
}
```

从这里就能看到 worker() 方法的调用入口，继续往后跟 worker() 方法肯定能找到一个 processNextReq() 方法：

```go
func (cc *jobcontroller) worker(i uint32) {
	klog.Infof("worker %d start ...... ", i)

	for cc.processNextReq(i) {
	}
}
```

从 `processNextReq()` 方法中就开始有“干货逻辑”了：

- `pkg/controllers/job/job_controller.go:310`

```go
func (cc *jobcontroller) processNextReq(count uint32) bool {
	queue := cc.queueList[count]
	obj, shutdown := queue.Get()
	// ......

	jobInfo, err := cc.cache.Get(key)
	// ......

	st := state.NewState(jobInfo)
	// ......

	if err := st.Execute(action); err != nil {
		// ......
	}

	queue.Forget(req)

	return true
}
```

这里的代码主要逻辑就上面这几行，我们来关注 `st.Execute(action)` 的逻辑。

首先 state.NewState(jobInfo) 调用返回了一个 st，这个 st 是什么呢？

- `pkg/controllers/job/state/factory.go:62`

```go
func NewState(jobInfo *apis.JobInfo) State {
	job := jobInfo.Job
	switch job.Status.State.Phase {
	case vcbatch.Pending:
		return &pendingState{job: jobInfo}
	case vcbatch.Running:
		return &runningState{job: jobInfo}
	case vcbatch.Restarting:
		return &restartingState{job: jobInfo}
	case vcbatch.Terminated, vcbatch.Completed, vcbatch.Failed:
		return &finishedState{job: jobInfo}
	case vcbatch.Terminating:
		return &terminatingState{job: jobInfo}
	case vcbatch.Aborting:
		return &abortingState{job: jobInfo}
	case vcbatch.Aborted:
		return &abortedState{job: jobInfo}
	case vcbatch.Completing:
		return &completingState{job: jobInfo}
	}

	// It's pending by default.
	return &pendingState{job: jobInfo}
}
```

盲猜 `State` 这时候对应一个 `*pendingState` 类型。所以我们接着找 `*pendingState` 对象的 `Execute()` 方法实现：

- `pkg/controllers/job/state/pending.go:29`

```go
func (ps *pendingState) Execute(action v1alpha1.Action) error {
	switch action {
	// ......
	default:
		return SyncJob(ps.job, func(status *vcbatch.JobStatus) bool {
			if ps.job.Job.Spec.MinAvailable <= status.Running+status.Succeeded+status.Failed {
				status.State.Phase = vcbatch.Running
				return true
			}
			return false
		})
	}
}
```

`SyncJob()` 函数在这里出现了。

### 3.2 SyncJob 过程如何创建 PodGroup 和 Pod

继续来看 SyncJob 的具体实现。上一节找到的 `SyncJob()` 函数中调用到了 `*jobcontroller.syncJob()` 方法，sync job 的具体逻辑就在这个 syncJob() 方法中实现。

这里主要有2个过程：

1. `initiateJob` 方法创建 PodGroup；
2. 创建 pods；

- `pkg/controllers/job/job_controller_actions.go:224`

```go
func (cc *jobcontroller) syncJob(jobInfo *apis.JobInfo, updateStatus state.UpdateStatusFn) error {
    // ......
}
```

这个方法有点长，哎，一言难尽。我想提个 pr 给它拆分一下…… Anyway，这个方法里主要关注2个过程，我们直接来看吧。

#### 3.2.1 创建 PodGroup

创建 PodGroup 的逻辑在 `initiateJob()` 方法中：

- `pkg/controllers/job/job_controller_actions.go:166`

```go
func (cc *jobcontroller) initiateJob(job *batch.Job) (*batch.Job, error) {
	// ......

	if err := cc.createOrUpdatePodGroup(newJob); err != nil {
		cc.recorder.Event(job, v1.EventTypeWarning, string(batch.PodGroupError),
			fmt.Sprintf("Failed to create PodGroup, err: %v", err))
		return nil, err
	}

	return newJob, nil
}
```

这里拿着 job 信息调用了一个 `createOrUpdatePodGroup()` 方法来完成和 Job 对应的 PodGroup 的创建。这个方法里 pg 实例化的主要逻辑是：

```go
pg := &scheduling.PodGroup{
    ObjectMeta: metav1.ObjectMeta{
        Namespace: job.Namespace,
        // 这个 pgName 内容是 job.Name + "-" + string(job.UID)
        Name:        pgName,
        Annotations: job.Annotations,
        Labels:      job.Labels,
        OwnerReferences: []metav1.OwnerReference{
            *metav1.NewControllerRef(job, helpers.JobKind),
        },
    },
    Spec: scheduling.PodGroupSpec{
        MinMember:         job.Spec.MinAvailable,
        MinTaskMember:     minTaskMember,
        Queue:             job.Spec.Queue,
        MinResources:      cc.calcPGMinResources(job),
        PriorityClassName: job.Spec.PriorityClassName,
    },
}
```

换言之 PodGroup 和 Job 是一一对应的关系。

#### 3.2.2 创建 Pods

继续来看创建 pods 的过程：

- `pkg/controllers/job/job_controller_actions.go:335`

```go
for _, ts := range job.Spec.Tasks {
    ts.Template.Name = ts.Name
    tc := ts.Template.DeepCopy()
    name := ts.Template.Name

    pods, found := jobInfo.Pods[name]
    if !found {
        pods = map[string]*v1.Pod{}
    }

    var podToCreateEachTask []*v1.Pod
    // 每个 Task 对应一组 pods，所以这里有一个循环
    for i := 0; i < int(ts.Replicas); i++ {
        podName := fmt.Sprintf(jobhelpers.PodNameFmt, job.Name, name, i)
        if pod, found := pods[podName]; !found {
            // 这个 createJobPod 只是组装 Pod 资源对象，类型是 *v1.Pod
            newPod := createJobPod(job, tc, ts.TopologyPolicy, i, jobForwarding)
            if err := cc.pluginOnPodCreate(job, newPod); err != nil {
                return err
            }
            // 加到队列中
            podToCreateEachTask = append(podToCreateEachTask, newPod)
            waitCreationGroup.Add(1)
        } else {
            // ......
        }
    }
    podToCreate[ts.Name] = podToCreateEachTask
    // ......
}
```

这一轮循环负责解析 Job 中的所有 Tasks，然后给每个 Task 创建对应的 pods，加入到 `podToCreateEachTask` 这个切片中，进而得到 `podToCreate` （类型是 `map[string][]*v1.Pod`）这个 map，map 的 key 是 Task 的 Name，value 是每个 Task 对应的需要创建的 pods 列表。

在 `createJobPod()` 方法中有这样几行和 annotation 相关的代码：

- `pkg/controllers/job/job_controller_util.go:100`

```go
index := strconv.Itoa(ix)
pod.Annotations[batch.TaskIndex] = index
pod.Annotations[batch.TaskSpecKey] = tsKey
pgName := job.Name + "-" + string(job.UID)
pod.Annotations[schedulingv2.KubeGroupNameAnnotationKey] = pgName
pod.Annotations[batch.JobNameKey] = job.Name
pod.Annotations[batch.QueueNameKey] = job.Spec.Queue
pod.Annotations[batch.JobVersion] = fmt.Sprintf("%d", job.Status.Version)
pod.Annotations[batch.PodTemplateKey] = fmt.Sprintf("%s-%s", job.Name, template.Name)
```

可以看到 Pod 的 annotation 里有一个 `KubeGroupNameAnnotationKey = pgName`，也就是 `scheduling.k8s.io/group-name=pg-name`，和前面我们在调度器里找到 annotation 匹配逻辑就对应上了。

然后来到第二个循环：

- `pkg/controllers/job/job_controller_actions.go:373`

```go
// 遍历刚才组装的 podToCreate map
for taskName, podToCreateEachTask := range podToCreate {
    if len(podToCreateEachTask) == 0 {
        continue
    }
    go func(taskName string, podToCreateEachTask []*v1.Pod) {
        // ......

        for _, pod := range podToCreateEachTask {
            go func(pod *v1.Pod) {
                defer waitCreationGroup.Done()
                // 创建 Pods
                newPod, err := cc.kubeClient.CoreV1().Pods(pod.Namespace).Create(context.TODO(), pod, metav1.CreateOptions{})
                // ......
            }(pod)
        }
    }(taskName, podToCreateEachTask)
}
```

## 4. 总结

今天我们先顺着 **Volcano Scheduler** 部分的代码找到了 `PodGroup` 的处理逻辑，看到了 Scheduler 拿到 PodGroup 后会组装 JobInfo 对象；拿到 Pod 后会组装 TaskInfo 对象（这里根据 Pod 的注解中指定的 PodGroup 名字来将 TaskInfo 和 JobInfo 关联，也就是 Pod 和 PodGroup 的关联。

接着我们又从 **Volcano Controller**（Job Controller）中找到了 `PodGroup` 和 `Pod` 的创建逻辑。在 Job 对象创建后，控制器会根据 Job 的信息创建一个唯一对应的 PodGroup，然后根据 Job 中的 Tasks 信息创建一系列的 pods，这些 pods 会带上 PodGroup 名字（在注解里）

至此，我们知道了 Volcano 中调度器和控制器的职责分层，进一步也就能够理解 Volcano 如何和 kubeflow 等其他框架结合完成复杂任务的批调度过程了。（上层框架创建 PodGroup 和 Pods，Volcano 根据 PodGroup 信息和 Pods 注解信息完成批调度过程。

## 5. 最后

下一步？我也没想好。

看了几天 Volcano 的源码，整体感觉还是比较酣畅淋漓。一开始被调度器里的 Job 和 Task 概念带坑里，感觉代码很混乱；但是理解了 wrapper 的用意，知道了“调度”领域的 job 和 task 有不一样的含义后，今天再刷就很轻松了。

Volcano 源码整体还是 K8s 的“控制器+调度器”的逻辑，然后加上“任务调度领域”内的各种算法组成，代码质量总的来说还可以，就是部分函数过长，循环嵌套过多，加上注释和文档的缺失，对于新人并不友好。

下一步我尝试参与下 Volcano 社区，看能不能在“代码可读性”方向出一份力吧。
