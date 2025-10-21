+++
title = "Volcano 源码分析（一）"
description = "Volcano 源码分析（一）"
subtitle = ""

date = 2023-12-29
lastmod = 2023-12-29
datemonth = "Dec"
dateyear = "2023"
dateday = 29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["Daniel Hu"]

tags = ["Tutorials"]
summary = "Volcano 源码分析（一）"

# Add menu entry to sidebar.
linktitle = "Volcano 源码分析（一）"
[menu.posts]
parent = "tutorials"
weight = 13
+++

{{<figure library="1" src="source-code-1-banner.jpeg">}}

> _本文首发于 [胡涛的个人网站]((https://www.danielhu.cn/volcano-source-code-1/))；作者：胡涛_

## 0. 总结前置

这段总结在文末还有，不过我还是决定在开头放一份，方便第二次翻阅的读者快速找到结论。你可以选择跳到[1. 概述](#1-概述)开始顺序阅读本文。

> 看到这里，我开始疑惑为什么调度里关注的是 Job，Task 这些，不应该是关注 PodGroup 吗？然后我找 Volcano 社区的几个朋友聊了下，回过头来再理代码，发现 Scheduler 里的 Job、Task 和 Controller 里的 Job、Task 并不是一回事。
>
> 对于熟悉 K8s 源码的读者而言，很容易带着 Job 就是 CR 的 Job 这种先入为主的观点开始看代码，并且觉得 Task 就是 CR Job 内的 Task。看到最后才反应过来，其实上面调度器里多次出现的 jobs 里放的那个 job 是 JobInfo 类型，JobInfo 类型对象里面的 Tasks 本质是 TaskInfo 类型对象的 map，而这个 TaskInfo 类型的 Task 和 Pod 是一一对应的，也就是 Pod 的一层 wrapper。
>
> 回过来看 Volcano 引入的 CR 中的 VolcanoJob 也不是 Scheduler 里出现的这个 Job。VolcanoJob 里也有一个 Tasks 属性，对应的类型是 TaskSpec 类型，这个 TaskSpec 类似于 K8s 的 RS 级别资源，里面包含 Pod 模板和副本数等。
>
> 因此调度器里的 Task 其实对应 Pod，当做 Pod wrapper 理解；而 Task 的集合也就是 Pod 的集合，名字叫做 job，但是对应 PodGroup；而控制器里的 Job，也就是 VolcanoJob，它的属性里并没有 PodGroup；相反调度器那个 JobInfo 类型的 job 其实属性里包含了一个 PodGroup，其实也可以认为是一个 PodGroup 的 wrapper。
>
> 所以看代码的过程中会一直觉得 Scheduler 在面向 Job 和 Task 调度，和 PodGroup 没有太大关系。其实这里的 Job 就是 PodGroup wrapper，Task 就是 Pod wrapper。

## 1. 概述

Volcano 是一个开源的 Kubernetes 批处理系统，专为高性能计算任务设计。它提供了一种高效的方式来管理和调度资源密集型作业，比如大数据处理和机器学习任务。

在批处理领域，任务通常需要大量计算资源，但这些资源在 Kubernetes 集群中可能是有限的或者分布不均。Volcano 尝试通过一些高级调度功能来解决这些问题，尽可能确保资源被高效利用，同时最小化作业的等待时间。这对于需要快速处理大量数据的场景尤其重要，如科学研究、金融建模或任何需要并行处理大量任务的应用。

Volcano 的关键特性之一是它的 gang 调度机制。这个机制允许同时调度一组相关任务，确保它们要么全部启动，要么都不启动。这种方法对于那些需要多个任务协同工作的复杂作业来说至关重要，因为它避免了部分任务因资源不足而无法执行的情况。

举个例子：Kubernetes 原生的调度器只能实现一个 Pod 一个 Pod 顺序调度，对于小规模在线服务而言，也基本够用。不过当一个服务需要大量 Pod 一起启动才能正常运行时（比如一次模型训练任务需要用到100个 pods 时，如何保证这100个 pods 要么都成功调度，要么都不被调度呢？这时候就需要 Volcano 提供的 gang 调度能力了。

今天咱就来具体分析下 Volcano 的工作原理。

## 2. Volcano 核心概念

先认识下 Volcano 的几个核心概念。

### 2.1 认识 Queue、PodGroup 和 VolcanoJob

Volcano 引入了几个新概念：

1. `Queue`
2. `PodGroup`
3. `VolcanoJob`

这些都是 K8s 里的自定义资源，也就是我们能够通过 kubectl 命令查到相应的资源对象，好比 Deployment、Service、Pod 这些。

在 Volcano 中，`Queue` 用于管理和优先级排序任务。它允许用户根据业务需求或优先级，将作业分组到不同的队列中。这有助于更好地控制资源分配和调度优先级，确保高优先级的任务可以优先获取资源。

`PodGroup` 一组相关的 Pod 集合。这主要解决了 Kubernetes 原生调度器中单个 Pod 调度的限制。通过将相关的 Pod 组织成 PodGroup，Volcano 能够更有效地处理那些需要多个 Pod 协同工作的复杂任务。

`VolcanoJob` 是 Volcano 中的一个核心概念，它扩展了 Kubernetes 的 Job 资源。VolcanoJob 不仅包括了 Kubernetes Job 的所有特性，还加入了对批处理作业的额外支持，使得 Volcano 能够更好地适应高性能和大规模计算任务的需求。

### 2.2. Queue、PodGroup 和 VolcanoJob 的关系

大致知道了 Volcano 中有 Queue、PodGroup 和 VolcanoJob 三种自定义资源后，我们接着具体看下这三种资源的作用、关系等。

首先，`Queue` 是一个 `PodGroup` 队列，`PodGroup` 是一组强关联的 `Pod` 集合。而 `VolcanoJob` 则是一个 K8s Job 升级版，对应的下一级资源是 `PodGroup`。换言之，就好比 ReplicaSet 的下一级资源是 Pod 一样。

所以 VolcanoJob 背后对应一个 K8s 里的自定义控制器（Operator 模式），这个控制器会根据 VolcanoJob 的具体配置去创建相应的 PodGroup 出来。而 PodGroup 最终会被当做一个整体被 Volcano Scheduler 调度。在调度的过程中，Volcano 还用到了 Queue 来实现 PodGroup 的排队、优先级控制等逻辑。

{{<figure library="1" src="source-code-1-1.png">}}

## 3. Volcano 调度框架概览

继续看 Volcano 调度逻辑的实现框架。

官方文档里有一张图，长这样：

{{<figure library="1" src="source-code-1-2.png">}}

第一眼看这张图会有点蒙，主要是如何理解 `Action` 和 `Plugin` 两个概念，以及具体的 actions 和 plugins 作用是啥。

简单来说，Volcano 调度过程中会执行一系列的动作，这些动作也就是 Action，主要是 **enqueue、allocate、backfill** 这些。具体有哪些 actions，默认执行哪些 actions，后面我们到源码里去寻找。然后每个具体的 Action 中执行什么算法逻辑，就取决于注册进去的 plugins。换言之，actions 是基本固定的，合计6个（刚翻源码看到的，文档落后了），可选执行其中某几个；而 plugins 就有点多了（十几个），具体哪些 plugins 在哪个 Action 中被调用呢？咱接下来翻源码扒一扒。

## 4. 源码分析

接下来开始带着问题读源码。

### 4.1 Action 实现在哪里？

Action 相关源码入口还是很好找，Volcano 在 `pkg/scheduler` 中放了调度器相关的代码，里面有一个 actions 目录。在 actions 目录里的 `factory.go` 源文件中包含了一个 init 函数：

- `pkg/scheduler/actions/factory.go:29`

```go
func init() {
	framework.RegisterAction(reclaim.New())
	framework.RegisterAction(allocate.New())
	framework.RegisterAction(backfill.New())
	framework.RegisterAction(preempt.New())
	framework.RegisterAction(enqueue.New())
	framework.RegisterAction(shuffle.New())
}
```

可以看到这里注册了6个 actions。`RegisterAction` 方法的实现也很简单：

- `pkg/scheduler/framework/plugins.go:102`

```go
var actionMap = map[string]Action{}

// RegisterAction register action
func RegisterAction(act Action) {
	pluginMutex.Lock()
	defer pluginMutex.Unlock()

	actionMap[act.Name()] = act
}
```

有一个 `actionMap` 来保存所有的 actions。这里的 Action 是一个 interface，定义如下：

- `pkg/scheduler/framework/interface.go:20`

```go
// Action is the interface of scheduler action.
type Action interface {
	// The unique name of Action.
	Name() string

	// Initialize initializes the allocator plugins.
	Initialize()

	// Execute allocates the cluster's resources into each queue.
	Execute(ssn *Session)

	// UnIntialize un-initializes the allocator plugins.
	UnInitialize()
}
```

### 4.2 从 main 函数入手看调度器启动过程

接着我们从 main 函数入手看调度器启动过程，看能不能找到 Action 是从哪里被调用的，actions 的调用顺序等相关逻辑，进而后面我们可以按照 actions 执行顺序来逐个分析具体的 Action 行为。

#### 4.2.1 入口逻辑

调度器源码入口很直观：

{{<figure library="1" src="source-code-1-3.png">}}

main 函数中主要逻辑是调用这个 `Run()` 方法：

- `cmd/scheduler/main.go:71`

```go
	if err := app.Run(s); err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
```

`Run()` 方法负责启动一个 Volcano 调度器，里面核心代码只有下列2行，先构造 `Scheduler` 对象，然后调用其 `Run()` 方法：

```go
sched, err := scheduler.NewScheduler(config, opt)
// ……
sched.Run(ctx.Done())
```

#### 4.2.2 NewScheduler() 方法

接着看 `NewScheduler` 和 `Run()` 两个方法：

- `pkg/scheduler/scheduler.go:59`

```go
// NewScheduler returns a scheduler
func NewScheduler(config *rest.Config, opt *options.ServerOption) (*Scheduler, error) {
	// ……

	cache := schedcache.New(config, opt.SchedulerNames, opt.DefaultQueue, opt.NodeSelector, opt.NodeWorkerThreads)
	scheduler := &Scheduler{
		schedulerConf:  opt.SchedulerConf,
		fileWatcher:    watcher,
		cache:          cache,
		schedulePeriod: opt.SchedulePeriod,
		dumper:         schedcache.Dumper{Cache: cache},
	}

	return scheduler, nil
}
```

这里主要涉及到一个 `Scheduler` 对象，看起来是调度过程的核心实现对象：

- `pkg/scheduler/scheduler.go:44`

```go
// Scheduler watches for new unscheduled pods for volcano. It attempts to find
// nodes that they fit on and writes bindings back to the api server.
type Scheduler struct {
	cache          schedcache.Cache
	schedulerConf  string
	fileWatcher    filewatcher.FileWatcher
	schedulePeriod time.Duration
	once           sync.Once

	mutex          sync.Mutex
	actions        []framework.Action
	plugins        []conf.Tier
	configurations []conf.Configuration
	metricsConf    map[string]string
	dumper         schedcache.Dumper
}
```

#### 4.2.3 Run() 方法

暂时不忙细看每个属性，继续来看 Run 方法：

```go
// Run runs the Scheduler
func (pc *Scheduler) Run(stopCh <-chan struct{}) {
	pc.loadSchedulerConf()
	go pc.watchSchedulerConf(stopCh)
	// Start cache for policy.
	pc.cache.SetMetricsConf(pc.metricsConf)
	pc.cache.Run(stopCh)
	pc.cache.WaitForCacheSync(stopCh)
	klog.V(2).Infof("scheduler completes Initialization and start to run")
	go wait.Until(pc.runOnce, pc.schedulePeriod, stopCh)
	if options.ServerOpts.EnableCacheDumper {
		pc.dumper.ListenForSignal(stopCh)
	}
	go runSchedulerSocket()
}
```

这个就是 Scheduler 的启动逻辑了，我们先来看这里被周期性调用的 `runOnce` 方法，这个方法每隔1秒被执行一次：

- `pkg/scheduler/scheduler.go:99`

```go
func (pc *Scheduler) runOnce() {
	// ……

	actions := pc.actions
	plugins := pc.plugins
	configurations := pc.configurations
	pc.mutex.Unlock()

	//Load configmap to check which action is enabled.
	conf.EnabledActionMap = make(map[string]bool)
	for _, action := range actions {
		conf.EnabledActionMap[action.Name()] = true
	}

	ssn := framework.OpenSession(pc.cache, plugins, configurations)
	defer func() {
		framework.CloseSession(ssn)
		metrics.UpdateE2eDuration(metrics.Duration(scheduleStartTime))
	}()

	for _, action := range actions {
		actionStartTime := time.Now()
		action.Execute(ssn)
		metrics.UpdateActionDuration(action.Name(), metrics.Duration(actionStartTime))
	}
}
```

可以看到在 `runOnce` 中的2个关键步骤：

1. `ssn := framework.OpenSession(pc.cache, plugins, configurations)`
2. 遍历 actions，调用 `action.Execute(ssn)`

这里的 actions 集合是什么呢？OpenSession 拿到的 plugins 又是啥呢？

进一步跟代码可以找到如下默认配置：

- `pkg/scheduler/util.go:31`

```go
var defaultSchedulerConf = `
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: conformance
- plugins:
  - name: overcommit
  - name: drf
  - name: predicates
  - name: proportion
  - name: nodeorder
`
```

所以默认配置下，执行的 actions 是 **enqueue, allocate, backfill** 三个。再看默认方式部署后容器内的配置文件：

```bash
# cat /volcano.scheduler/volcano-scheduler.conf
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
  - name: priority
  - name: gang
    enablePreemptable: false
  - name: conformance
- plugins:
  - name: overcommit
  - name: drf
    enablePreemptable: false
  - name: predicates
  - name: proportion
  - name: nodeorder
  - name: binpack
```

plugins 稍有不同，一个是 `glang` 和 `drf` 多了 `enablePreemptable`，一个是多了 `binpack`。接下来我们先看 actions 和 plugins 的调用逻辑，再看具体的 actions 和 plugins 分别是什么含义。

### 4.3 寻找 actions 和 plugins 的调用逻辑

前面我们看到 `runOnce()` 方法里的2个关键步骤：

1. `ssn := framework.OpenSession(pc.cache, plugins, configurations)`
2. 遍历 actions，调用 `action.Execute(ssn)`

接下来咱顺着这两步来寻找 actions 和 plugins 的调用逻辑。

#### 4.3.1 理解 Session 以及 plugins 被调用的本质

`framework.OpenSession()` 函数打开了一个 Session。不过什么是 Session 呢？来具体看下 `OpenSession()` 函数的实现：

- `pkg/scheduler/framework/framework.go:30`

```go
func OpenSession(cache cache.Cache, tiers []conf.Tier, configurations []conf.Configuration) *Session {
	ssn := openSession(cache)
	ssn.Tiers = tiers
	ssn.Configurations = configurations
	ssn.NodeMap = GenerateNodeMapAndSlice(ssn.Nodes)
	ssn.PodLister = NewPodLister(ssn)

	for _, tier := range tiers {
		for _, plugin := range tier.Plugins {
			if pb, found := GetPluginBuilder(plugin.Name); !found {
				klog.Errorf("Failed to get plugin %s.", plugin.Name)
			} else {
				plugin := pb(plugin.Arguments)
				ssn.plugins[plugin.Name()] = plugin
				onSessionOpenStart := time.Now()
				plugin.OnSessionOpen(ssn)
				metrics.UpdatePluginDuration(plugin.Name(), metrics.OnSessionOpen, metrics.Duration(onSessionOpenStart))
			}
		}
	}
	return ssn
}
```

这里的 Session 对象属性很多，不过还是值得浏览一遍，大概心里有个印象，知道哪些功能被封装进去了：

- `pkg/scheduler/framework/session.go:45`

```go
type Session struct {
	UID types.UID

	kubeClient      kubernetes.Interface
	recorder        record.EventRecorder
	cache           cache.Cache
	restConfig      *rest.Config
	informerFactory informers.SharedInformerFactory

	TotalResource *api.Resource
	// podGroupStatus cache podgroup status during schedule
	// This should not be mutated after initiated
	podGroupStatus map[api.JobID]scheduling.PodGroupStatus

	Jobs           map[api.JobID]*api.JobInfo
	Nodes          map[string]*api.NodeInfo
	CSINodesStatus map[string]*api.CSINodeStatusInfo
	RevocableNodes map[string]*api.NodeInfo
	Queues         map[api.QueueID]*api.QueueInfo
	NamespaceInfo  map[api.NamespaceName]*api.NamespaceInfo

	// NodeMap is like Nodes except that it uses k8s NodeInfo api and should only
	// be used in k8s compatable api scenarios such as in predicates and nodeorder plugins.
	NodeMap   map[string]*k8sframework.NodeInfo
	PodLister *PodLister

	Tiers          []conf.Tier
	Configurations []conf.Configuration
	NodeList       []*api.NodeInfo

	plugins           map[string]Plugin
	eventHandlers     []*EventHandler
	jobOrderFns       map[string]api.CompareFn
	queueOrderFns     map[string]api.CompareFn
	taskOrderFns      map[string]api.CompareFn
	clusterOrderFns   map[string]api.CompareFn
	predicateFns      map[string]api.PredicateFn
	prePredicateFns   map[string]api.PrePredicateFn
	bestNodeFns       map[string]api.BestNodeFn
	nodeOrderFns      map[string]api.NodeOrderFn
	batchNodeOrderFns map[string]api.BatchNodeOrderFn
	nodeMapFns        map[string]api.NodeMapFn
	nodeReduceFns     map[string]api.NodeReduceFn
	preemptableFns    map[string]api.EvictableFn
	reclaimableFns    map[string]api.EvictableFn
	overusedFns       map[string]api.ValidateFn
	allocatableFns    map[string]api.AllocatableFn
	jobReadyFns       map[string]api.ValidateFn
	jobPipelinedFns   map[string]api.VoteFn
	jobValidFns       map[string]api.ValidateExFn
	jobEnqueueableFns map[string]api.VoteFn
	jobEnqueuedFns    map[string]api.JobEnqueuedFn
	targetJobFns      map[string]api.TargetJobFn
	reservedNodesFns  map[string]api.ReservedNodesFn
	victimTasksFns    map[string][]api.VictimTasksFn
	jobStarvingFns    map[string]api.ValidateFn
}
```

在 `OpenSession()` 函数中，plugins 被遍历，然后依次调用 `plugin.OnSessionOpen(ssn)` 方法。这个 `OnSessionOpen(ssn)` 方法的调用并不会执行具体的动作，只是注册了一堆的方法到 Session 里，比如上面这个 Session 对象的 preemptableFns 属性就会在 `gangPlugin` 的 `OnSessionOpen()` 方法被调用时初始化，执行一行类似 `ssn.preemptableFns[gp.Name()] = preemptableFn` 的逻辑。所以一堆的 plugins 的调用逻辑就是将算法注册到 Session 里。

接着看一眼 Plugin 对象的定义，其实很简洁：

- `pkg/scheduler/framework/interface.go:35`

```go
type Plugin interface {
	Name() string

	OnSessionOpen(ssn *Session)
	OnSessionClose(ssn *Session)
}
```

#### 4.3.2 理解 actions 的执行逻辑

我们已经看到了 plugins 最终就是被绑到 Session 上的一堆算法，那么这些算法是怎样被调用的呢？在 `runOnce()` 方法中的第二个主要逻辑是：

```go
	for _, action := range actions {
		actionStartTime := time.Now()
		action.Execute(ssn)
		metrics.UpdateActionDuration(action.Name(), metrics.Duration(actionStartTime))
	}
```

也就是 actions 被遍历，然后依次执行 Execute() 方法，这里传递了一个 ssn（*Session 类型）对象进去。所以下一步的重点就是看 `Execute()` 方法的执行逻辑。

{{<figure library="1" src="source-code-1-4.png">}}

前面提到默认被执行的 actions 只有三个：enqueue, allocate 和 backfill。到这里可以看到接着的逻辑就是逐个调用这些 actions 的 Execute() 方法，那么 Execute() 里放的应该就是 Action 的具体逻辑了。

到这里在回过头来看官网的图，主流程就很好理解了：

{{<figure library="1" src="source-code-1-2.png">}}

一个个 plugins 注册具体的算法函数到 Session 里，然后 actions 顺序执行的过程中，到 Session 里去取相应的算法函数来执行。

### 4.4 Action 分析：enqueue

`enqueue` Action 的 `Execute()` 方法骨架如下：

- `pkg/scheduler/actions/enqueue/enqueue.go:44`

```go
func (enqueue *Action) Execute(ssn *framework.Session) {
	// ......
	queues := util.NewPriorityQueue(ssn.QueueOrderFn)
	queueSet := sets.NewString()
	jobsMap := map[api.QueueID]*util.PriorityQueue{}

	for _, job := range ssn.Jobs {
		// ......
	}

	klog.V(3).Infof("Try to enqueue PodGroup to %d Queues", len(jobsMap))

	for {
		// ......
	}
}
```

开头引入了3个局部变量 queues、queueSet 和 jobsMap，接着执行了2个 for 循环，接着我们逐个来分析。

#### 4.4.1 queues、queueSet 和 jobsMap

**1. queues**

这里的 queues 是一个 Priority Queue，定义如下：

- `pkg/scheduler/util/priority_queue.go:26`

```go
type PriorityQueue struct {
	queue priorityQueue
}

type priorityQueue struct {
	items  []interface{}
	lessFn api.LessFn
}
```

这个队列的实现用了 heap 包，实现了一个“最大堆”，也就是每次 Pop() 会拿到一个优先级最高的 item。另外需要注意的是这里的 queues 用了复数形式，其实是因为下文这个队列的用法中，item 是一个队列，也就是当前队列中存放的还是队列。后面我们具体来看。

**2. queueSet**

这个没啥好说的，一个 name set。

**3. jobsMap**

这是一个从 QueueID 到 PriorityQueue 的 map

#### 4.4.2 for 循环遍历 jobs

这一段 for 循环的代码如下：

```go
// 这个 Job 是 Volcano 自定义资源 Job，不是 K8s 里的 Job；这里开始遍历所有 jobs
for _, job := range ssn.Jobs {
	if job.ScheduleStartTimestamp.IsZero() {
		ssn.Jobs[job.UID].ScheduleStartTimestamp = metav1.Time{
			Time: time.Now(),
		}
	}
	// 如果 job 中定义的 Queue 在 Session 中存在，那就执行
	// queueSet.Insert(string(queue.UID)) 和
	// queues.Push(queue)；注意这里 Push 进去的是 queue
	if queue, found := ssn.Queues[job.Queue]; !found {
		klog.Errorf("Failed to find Queue <%s> for Job <%s/%s>",
			job.Queue, job.Namespace, job.Name)
		continue
	} else if !queueSet.Has(string(queue.UID)) {
		klog.V(5).Infof("Added Queue <%s> for Job <%s/%s>",
			queue.Name, job.Namespace, job.Name)

		// 这里构建了一个 queue UID 的 set 和一个 queue 队列（优先级队列，heap 实现）
		queueSet.Insert(string(queue.UID))
		queues.Push(queue)
	}

	if job.IsPending() {
		// 如果 job 指定的 queue 还没存到 jobsMap 里，则创建一个对应的 PriorityQueue
		if _, found := jobsMap[job.Queue]; !found {
			jobsMap[job.Queue] = util.NewPriorityQueue(ssn.JobOrderFn)
		}
		klog.V(5).Infof("Added Job <%s/%s> into Queue <%s>", job.Namespace, job.Name, job.Queue)
		// 将 job 加到指定 queue 中
		jobsMap[job.Queue].Push(job)
	}
}
```

这个 for 循环主要做2件事情，一个是遍历 jobs 的过程中判断用到了哪些 Queue（K8s 自定义资源对象），将这些 Queue 保存到 queueSet 和 queues 中；另外一个就是将处于 Pending 状态的 jobs 加入到 jobsMap 中。这里涉及到自定义资源 Queue 和局部变量 queue、queues 这些，看起来有点绕。

#### 4.4.3 无限循环 for

```go
for {
	// 没有队列，退出循环
	if queues.Empty() {
		break
	}

	// 从优先级队列 queues 中 Pop 一个高优的队列出来
	queue := queues.Pop().(*api.QueueInfo)

	// 如果这个高优队列在 jobsMap 里没有保存相应的 jobs，也就是为空，那就继续下一轮循环
	jobs, found := jobsMap[queue.UID]
	if !found || jobs.Empty() {
		continue
	}
	// jobs 也是一个优先级队列，Pop 一个高优 job 出来
	job := jobs.Pop().(*api.JobInfo)

	if job.PodGroup.Spec.MinResources == nil || ssn.JobEnqueueable(job) {
		ssn.JobEnqueued(job)
		// Phase 更新为 "Inqueue"
		job.PodGroup.Status.Phase = scheduling.PodGroupInqueue
		// 将当前 job 加入到 ssn.Jobs map
		ssn.Jobs[job.UID] = job
	}

	// 将前面 Pop 出来的 queue 加回到 queues 中，直到 queue 中没有 job，这样逐步 queues 为空空，上面的 Empty() 方法就会返回 true，然后循环退出。
	queues.Push(queue)
}
```

这个循环的逻辑是消化队列里的 jobs。首先将全局队列按照优先级 Pop 一个高优队列出来，然后根据这个队列的 UID 找到本地 jobsMap 里对应的 jobs 队列，这又是一个优先级队列。最后从这个优先级队列中 Pop 一个高优 Job 出来，将其状态设置成 Inqueue。

{{<figure library="1" src="source-code-1-5.png">}}

**总的来说，enqueue 过程就是按照队列的优先级顺序，将队列中的 jobs 再按照优先级依次标记为 "Inqueue" 状态（job.PodGroup.Status.Phase = "Inqueue"）。**

### 4.5 Action 分析：allocate

接着来看 allocate 过程。

#### 4.5.1 allocate.Execute() 整体逻辑

`allocate.Execute()` 方法的实现如下：

- `pkg/scheduler/actions/allocate/allocate.go:44`

```go
func (alloc *Action) Execute(ssn *framework.Session) {
	klog.V(5).Infof("Enter Allocate ...")
	defer klog.V(5).Infof("Leaving Allocate ...")

	// the allocation for pod may have many stages
	// 1. pick a queue named Q (using ssn.QueueOrderFn)
	// 2. pick a job named J from Q (using ssn.JobOrderFn)
	// 3. pick a task T from J (using ssn.TaskOrderFn)
	// 4. use predicateFn to filter out node that T can not be allocated on.
	// 5. use ssn.NodeOrderFn to judge the best node and assign it to T

	// queues sort queues by QueueOrderFn.
	queues := util.NewPriorityQueue(ssn.QueueOrderFn)
	// jobsMap is used to find job with the highest priority in given queue.
	jobsMap := map[api.QueueID]*util.PriorityQueue{}

	for _, job := range ssn.Jobs {
		// ......
	}

	klog.V(3).Infof("Try to allocate resource to %d Queues", len(jobsMap))

	pendingTasks := map[api.JobID]*util.PriorityQueue{}

	allNodes := ssn.NodeList
	predicateFn := func(task *api.TaskInfo, node *api.NodeInfo) ([]*api.Status, error){
		// ......
	}

	for {
		// ......
	}
```

我把三个相对独立的逻辑模块替换成了省略号，剩下的内容就不到十行了，相对好理解很多。我们先看这不到十行的方法主体，再看省略的三部分逻辑。

首先这里还是引入了一个优先级队列 queues 和一个从 queue id 到一个优先级队列的 map jobsMap。

- **queues**：一个元素为优先级队列的优先级队列，也就是一个保存 queue 的“最大堆”，从而方便获取一个优先级最高的 queue；
- **jobsMap**：一个 map，key 是 queue 的 id，value 是一个优先级队列，也就是一个特定的 queue，queue 中存着 jobs；通过这个 map 可以方便获取指定 queue 中的一个优先 job；

#### 4.5.2 第一个 for 循环的逻辑

```go
for _, job := range ssn.Jobs {
	// ......
	jobsMap[job.Queue].Push(job)
}
```

这个 for 看着长，不过除了一些健壮性逻辑之外，核心逻辑只有这样一行，也就是遍历 jobs，将其按照 queue 不同存到 jobsMap 中。

#### 4.5.3 预选函数 predicateFn

接着来看预选函数 predicateFn 的实现逻辑。

```go
predicateFn := func(task *api.TaskInfo, node *api.NodeInfo) ([]*api.Status, error) {
	// Check for Resource Predicate
	if ok, resources := task.InitResreq.LessEqualWithResourcesName(node.FutureIdle(), api.Zero); !ok {
		return nil, api.NewFitError(task, node, api.WrapInsufficientResourceReason(resources))
	}
	var statusSets util.StatusSets
	statusSets, err := ssn.PredicateFn(task, node)
	if err != nil {
		return nil, api.NewFitError(task, node, err.Error())
	}

	if statusSets.ContainsUnschedulable() || statusSets.ContainsUnschedulableAndUnresolvable() ||
		statusSets.ContainsErrorSkipOrWait() {
		return nil, api.NewFitError(task, node, statusSets.Message())
	}
	return nil, nil
}
```

这里的逻辑是接收一个 task 和 node 作为参数，然后判断这个 node 上能否跑起来这个 task。返回值 Status 类型是一个结构体，定义如下：

```go
type Status struct {
	Code   int
	Reason string
}
```

Code 的可选值有5个：`Success`、`Error`、`Unschedulable`、`UnschedulableAndUnresolvable`、`Wait` 和 `Skip`。这里主要需要理解三个状态：

1. Success：可调度
2. Unschedulable：不可调度，但是驱逐后可能可调度
3. UnschedulableAndUnresolvable：不可调度且驱逐也不可调度

接着我们去看这个 predicateFn 是如何被调用的。

#### 4.5.4 第二个 for 循环的逻辑

这个 for 循环行数超过 160，真是，，，不优雅。

- `pkg/scheduler/actions/allocate/allocate.go:120`

```go
for {
	if queues.Empty() {
		break
	}

	// Pop 一个最高优的 queue 出来
	queue := queues.Pop().(*api.QueueInfo)
	// ......
	// jobs 也就是这个高优 queue 中的所有 jobs
	jobs, found := jobsMap[queue.UID]
	if !found || jobs.Empty() {
		klog.V(4).Infof("Can not find jobs for queue %s.", queue.Name)
		continue
	}

	// job 就是 jobs 这个优先级队列中的最高优条目
	job := jobs.Pop().(*api.JobInfo)
	if _, found = pendingTasks[job.UID]; !found {
		// tasks 也是一个优先级队列，里面保存一个 job 下的所有 tasks
		tasks := util.NewPriorityQueue(ssn.TaskOrderFn)
		for _, task := range job.TaskStatusIndex[api.Pending] {
			// Skip BestEffort task in 'allocate' action.
			if task.Resreq.IsEmpty() {
				klog.V(4).Infof("Task <%v/%v> is BestEffort task, skip it.",
					task.Namespace, task.Name)
				continue
			}
			// 将 task Push 到 tasks 队列中
			tasks.Push(task)
		}
		// 这个 map 的 key 是 job 的 id，value 是 tasks 队列
		pendingTasks[job.UID] = tasks
	}
	tasks := pendingTasks[job.UID]

	// Added Queue back until no job in Namespace.
	queues.Push(queue)

	if tasks.Empty() {
		continue
	}

	klog.V(3).Infof("Try to allocate resource to %d tasks of Job <%v/%v>",
		tasks.Len(), job.Namespace, job.Name)

	stmt := framework.NewStatement(ssn)
	ph := util.NewPredicateHelper()
	// tasks 不为空时，开一个循环来消化这些 tasks；这里的 tasks 属于同一个 job
	for !tasks.Empty(){
		// ......
	}

	if ssn.JobReady(job) {
		stmt.Commit()
	} else {
		if !ssn.JobPipelined(job) {
			stmt.Discard()
		}
	}
}
```

继续来看内部循环，也就是 tasks 不 Empty 的时候相应的处理逻辑：

- `pkg/scheduler/actions/allocate/allocate.go:169`

```go
for !tasks.Empty() {
	// 取出最高优的 task
	task := tasks.Pop().(*api.TaskInfo)

	// ......

	// 跑一次预选算法，具体算法内容后面再分析
	if err := ssn.PrePredicateFn(task); err != nil {
		klog.V(3).Infof("PrePredicate for task %s/%s failed for: %v", task.Namespace, task.Name, err)
		fitErrors := api.NewFitErrors()
		for _, ni := range allNodes {
			fitErrors.SetNodeError(ni.Name, err)
		}
		job.NodesFitErrors[task.UID] = fitErrors
		break
	}

	// 拿到预选通过的节点列表
	predicateNodes, fitErrors := ph.PredicateNodes(task, allNodes, predicateFn, true)
	if len(predicateNodes) == 0 {
		job.NodesFitErrors[task.UID] = fitErrors
		break
	}

	// 候选节点列表，注意这里是二维切片，后面会依次直接保存 idleCandidateNodes 和 futureIdleCandidateNodes 两个切片本身进去
	var candidateNodes [][]*api.NodeInfo
	// 空闲候选节点列表
	var idleCandidateNodes []*api.NodeInfo
	// 未来空闲候选节点列表（预期即将有资源会被释放出来的节点）
	var futureIdleCandidateNodes []*api.NodeInfo
	for _, n := range predicateNodes {
		if task.InitResreq.LessEqual(n.Idle, api.Zero) {
			idleCandidateNodes = append(idleCandidateNodes, n)
		} else if task.InitResreq.LessEqual(n.FutureIdle(), api.Zero) {
			futureIdleCandidateNodes = append(futureIdleCandidateNodes, n)
		} else {
			klog.V(5).Infof("Predicate filtered node %v, idle: %v and future idle: %v do not meet the requirements of task: %v",
				n.Name, n.Idle, n.FutureIdle(), task.Name)
		}
	}
	// 填充候选节点列表
	candidateNodes = append(candidateNodes, idleCandidateNodes)
	candidateNodes = append(candidateNodes, futureIdleCandidateNodes)

	// 准备寻找最优节点
	var bestNode *api.NodeInfo
	// for 循环变量里用的是 nodes，也就是先拿到 idleCandidateNodes，再拿 futureIdleCandidateNodes
	for index, nodes := range candidateNodes {
		// ......
		switch {
		case len(nodes) == 0:
			klog.V(5).Infof("Task: %v, no matching node is found in the candidateNodes（index: %d） list.", task.Name, index)
		case len(nodes) == 1: // If only one node after predicate, just use it.
			bestNode = nodes[0]
		case len(nodes) > 1: // If more than one node after predicate, using "the best" one
			// 优选算法来打分
			nodeScores := util.PrioritizeNodes(task, nodes, ssn.BatchNodeOrderFn, ssn.NodeOrderMapFn, ssn.NodeOrderReduceFn)

			bestNode = ssn.BestNodeFn(task, nodeScores)
			if bestNode == nil {
				bestNode = util.SelectBestNode(nodeScores)
			}
		}

		// 如果在 idleCandidateNodes 中找到合适的节点，那就不看 futureIdleCandidateNodes 了
		if bestNode != nil {
			break
		}
	}

	// 将前面找到的最佳节点相应资源分配给当前 task
	if task.InitResreq.LessEqual(bestNode.Idle, api.Zero) {
		// ......
		if err := stmt.Allocate(task, bestNode); err != nil {
			// ......
		} 
		// ......
	} else {
		// 将 node 上预期要释放的资源分配给当前 task
		if task.InitResreq.LessEqual(bestNode.FutureIdle(), api.Zero) {
			// ......
			if err := stmt.Pipeline(task, bestNode.Name); err != nil {
				klog.Errorf("Failed to pipeline Task %v on %v in Session %v for %v.",
					task.UID, bestNode.Name, ssn.UID, err)
			}
			// ......
		}
	}

	if ssn.JobReady(job) && !tasks.Empty() {
		jobs.Push(job)
		break
	}
}
```

这个 for 循环的逻辑主要是按照优先级依次给 tasks 寻找最合适的 node，找到后“预占”资源，于是按顺序逐步给所有的 tasks 都找到了最佳节点。

到这里我们没有具体去深究最后 pods 是如何被绑定到节点上的，也没有去看 Pipeline、Summit 这些逻辑；先放放，往后看完最后一个 Action backfill 之后，对整体框架熟悉了，再进一步分析细节。

### 4.6 Action 分析：backfill

backfill 的逻辑是遍历待调度 jobs（Inqueue 状态），然后将没有没有指明资源申请大小的 task 调度掉。不过这里没有处理一个 job 中部分 task 指明了资源大小，部分没有指定的场景。总之看起来不是核心逻辑，考虑到本文篇幅已经过长，这块暂时不赘述。

## 5. 总结

看到这里，我开始疑惑为什么调度里关注的是 Job，Task 这些，不应该是关注 PodGroup 吗？然后我找 Volcano 社区的几个朋友聊了下，回过头来再理代码，发现 Scheduler 里的 Job、Task 和 Controller 里的 Job、Task 并不是一回事。

对于熟悉 K8s 源码的读者而言，很容易带着 Job 就是 CR 的 Job 这种先入为主的观点开始看代码，并且觉得 Task 就是 CR Job 内的 Task。看到最后才反应过来，其实上面调度器里多次出现的 jobs 里放的那个 job 是 JobInfo 类型，JobInfo 类型对象里面的 Tasks 本质是 TaskInfo 类型对象的 map，而这个 TaskInfo 类型的 Task 和 Pod 是一一对应的，也就是 Pod 的一层 wrapper。

回过来看 Volcano 引入的 CR 中的 VolcanoJob 也不是 Scheduler 里出现的这个 Job。VolcanoJob 里也有一个 Tasks 属性，对应的类型是 TaskSpec 类型，这个 TaskSpec 类似于 K8s 的 RS 级别资源，里面包含 Pod 模板和副本数等。

因此调度器里的 Task 其实对应 Pod，当做 Pod wrapper 理解；而 Task 的集合也就是 Pod 的集合，名字叫做 job，但是对应 PodGroup；而控制器里的 Job，也就是 VolcanoJob，它的属性里并没有 PodGroup；相反调度器那个 JobInfo 类型的 job 其实属性里包含了一个 PodGroup，其实也可以认为是一个 PodGroup 的 wrapper。

所以看代码的过程中会一直觉得 Scheduler 在面向 Job 和 Task 调度，和 PodGroup 没有太大关系。其实这里的 Job 就是 PodGroup wrapper，Task 就是 Pod wrapper。

## 6. 结尾

在大致知道 Scheduler 的工作过程后，还有很多的细节等着我们进一步分析。比如：

1. 从 PodGroup 的创建入手，Scheduler 如何接手 PodGroup 完成调度过程的呢？（这条路一定走得通，不然其他框架，比如 Kubeflow 等就无法和 Volcano 整合了。）
2. PodGroup 里不包含 pods 信息，那 Scheduler 如何找到对应的 Pod 完成节点绑定呢？（粗看应该是通过 Pod 的 annotation 来过滤特定 PodGroup 名下的 pods，然后完成的调度。
3. Job（vcjob）和 PodGroup 控制器的主要工作逻辑是什么？
4. ……

2023年最后一个工作日了，肝不动了，节后继续刷。（预知下文，记得关注微信公众号：**胡说云原生**，宝子们年后见！）
