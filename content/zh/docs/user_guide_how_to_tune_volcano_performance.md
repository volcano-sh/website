++
title = "在大规模场景下如何优化 Volcano 性能"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_tune_volcano_performance/"
[menu.docs]
  parent = "user-guide"
++

> 本文源自中国科学院主办的“开源推广计划（OSPP）”中《Volcano 大规模性能测试与调优》项目。  
> 所有实验数据与分析已发布于作者（@Freshwlnd）的系列博客。

## 1. 引言

### 1.1 背景与目标

Volcano 是广泛应用于 AI、大数据与 HPC 场景的主流云原生批处理系统。  
本项目的目标是：在 **万级 Pod 负载** 下，通过系统性的大规模性能测试，**复现并识别 Volcano 的性能瓶颈**，最终给出一份可落地的调优指南，并对未来架构优化方向提出建议。

### 1.2 总体结论概览

通过系统化的实验，我们得出了以下核心结论：

1. **强场景相关性**：Volcano 的性能高度依赖调度场景。  
   在 **开启 Gang 调度** 时，Volcano 的性能**显著优于其他调度器**，充分体现了其在批处理与 AI 场景中的核心优势。  
   而在未启用 Gang 的通用场景下，由于面向复杂场景设计的 Job 管理链路会引入额外开销，仍然存在一定优化空间。
2. **Webhook 是主要性能瓶颈**：在大规模、资源紧张的集群中，默认的 Webhook 配置（10s 超时）是导致大规模 Pod 创建失败的直接原因，而 Webhook 校验链本身引入的额外开销也是重要的性能因素。
3. **Controller worker 线程存在最优值**：`--worker-threads` 并非“越大越好”。不合理的配置可能因 CPU 资源耗尽或加剧 API-Server 争用而导致性能下降，呈现典型的 **“V 型”性能曲线**。
4. **CREATE / SCHEDULE 间的 API-Server 争用**：在高并发场景中，Controller（CREATE）与 Scheduler（SCHEDULE）对 K8s API-Server / ETCD 的并发写入会产生排队与重试，从宏观现象上表现为 “阶梯式停顿”，两条曲线交替前进。同时，盲目提高 CREATE 速率，反而可能拉长整体调度完成时间。

## 2. 测试与监控环境说明

本次测试的核心是基于开源框架 `kube-scheduling-perf` 扩展，构造本地 Kind 集群中的大规模 Pod 调度场景。

- **测试框架**：`wzshiming/kube-scheduling-perf` 项目通过 Makefile 实现一键化编排，可完成：
  - 集群搭建；
  - 多场景基准测试执行；
  - 监控数据采集；
  - 结果归档等。
- **数据采集**：框架通过 `audit-exporter` 从 `kube-apiserver` 审计日志（`audit.log`）中精确提取 `Pod Create` 与 `Pod Schedule` 事件的时间戳。
- **核心指标：**
  - **横轴（X）**：测试运行时间（秒）；
  - **纵轴（Y）**：完成 `CREATE` / `SCHEDULE` 的 Pod 累积数量；
  - **曲线斜率**：代表瞬时吞吐量（Pod/s），是关键性能指标。

示意图如下：

![Illustrative Example](/img/performance-tuning/cumulative-pod-counts-alternating-stair-step.png)

## 3. 性能现象

### 3.1 核心性能现象

在一系列测试中，我们观察到如下现象：

- 在 **未开启 Gang 调度** 的情况下，Volcano 表现出一些独特的性能特征：
  1. **吞吐与“阶梯式停顿”**：`CREATED` 与 `SCHEDULED` 两条曲线呈现明显的阶梯状，交替出现“猛增”和“停滞”；
  2. **大规模 Pod 创建失败**：在单个 Job 内 Pod 数量极大（如 20 Jobs × 500 Pods）时，在默认配置下成功创建的 Pod 数量往往少于 2000。

  ![CREATE/SCHEDULE Stall Phenomenon](/img/performance-tuning/stair-step-stall-phenomenon.png)

- 在 **开启 Gang 调度**（Volcano 的核心场景）时：
  1. **性能优势明显**：得益于高效的 PodGroup 管理与 Gang 调度算法，Volcano 在该场景下显著优于其他调度器；
  2. **必要的额外开销**：所有调度器在开启 Gang 后总运行时间都会变长，这是更复杂计算带来的自然结果；但 Volcano 在该架构下仍能保持最高效率。  
     这也从侧面验证了 Volcano Job 管理链路的必要性与复杂度，生产环境中应为其分配足够资源，以发挥其优势。

### 3.2 典型场景分析

在总 Pod 数固定为 10k 的前提下，我们变更 Job 数量与每 Job Pod 数（有/无 Gang 两种模式），重点关注无 Gang 场景。

#### 测试环境

- **硬件**：Intel Xeon Gold 6230 @ 2.10GHz，8 核 CPU，15GB 内存，79GB 存储；
- **软件**：Docker 27.5.1，Kubernetes 1.32.2（Kind 集群），kubectl v1.33.2；
- **测试规模**：单次测试结果占用 1.3–2.7GB，总计约 15GB 数据；
- **对比验证**：在高配环境（24 核 CPU、96GB 内存）复测，以验证硬件资源对结果的影响。

#### 测试方法

- 在 `kube-scheduling-perf` 框架基础上扩展测试；
- 使用 `audit-exporter` 精确记录 `Pod Create` 与 `Pod Schedule` 事件；
- 通过对比 KubeCon Europe 2025 分享《A Comparative Analysis of Kueue, Volcano, and YuniKorn - Wei Huang, Apple & Shiming Zhang, DaoCloud》中展示的结果进行交叉验证。

#### 结果分析

在总 Pod 数为 10,000 的情况下，我们重点分析了以下四种典型组合（均为无 Gang 场景）：

##### Benchmark 1：10,000 Jobs × 1 Pod/Job

- **现象**：`CREATE` 与 `SCHEDULE` 曲线几乎完全重合，但整体斜率（吞吐）较 Job 数量较少的场景低，主要是复杂 Job 管理带来的额外开销；该现象在低配与高配环境均一致；
- **结论**：在此场景下，Job 对象自身处理开销很大，使得 **CREATE 阶段成为绝对性能瓶颈**。

##### Benchmark 2：500 Jobs × 20 Pods/Job

- **现象**：`SCHEDULED` 曲线明显落后于 `CREATED` 曲线，两条曲线均出现最明显的“阶梯式停顿”；  
  Volcano 在 CREATED 与 SCHEDULE 两个阶段均表现出周期性“冲高–停顿”的行为，且现象在不同硬件配置下一致；
- **结论**：此时 **SCHEDULE 阶段成为瓶颈**，Controller 与 Scheduler 之间对资源的争用最为突出。

##### Benchmark 3 & 4：20 Jobs × 500 Pods/Job & 1 Job × 10,000 Pods/Job

- **现象**：
  - `CREATED` 曲线在开始阶段快速上升，随后趋于平缓；
  - `SCHEDULED` 曲线缓慢线性增长，两者之间存在巨大“缺口”；
  - “阶梯式停顿”现象仅出现在 `CREATED` 曲线早期；
  - 在本地资源受限环境（8C/16G）中出现大量 Pod 创建失败。
- **结论**：当 Job 数量较少、单 Job Pod 数极大时，Controller 可以短时间内极快地完成 Pod 创建请求，从而使 **SCHEDULE 阶段成为绝对性能瓶颈**。

**关键发现**：在四种场景中，Volcano 的总调度时间都大致与 Job 数量成正比，说明性能瓶颈主要来自 Job 处理链路。

## 4. 性能瓶颈假设与验证

### 4.1 假设一：Webhook 是性能瓶颈

#### 4.1.1 验证（超时问题）

通过分析 `audit.log`，我们发现绝大多数 Pod 创建失败与 Webhook 超时（`timeoutSeconds=10`）有关：

- **Pod 创建失败率**：约 98.7% 的 Pod 创建请求因超时失败；
- **日志证据**：4.9GB 审计日志中存在大量超时错误；
- **超时配置**：Webhook 默认超时为 10 秒。

统计命令示例：

```bash
# 统计错误次数
grep -c "context deadline exceeded" kube-apiserver-audit.volcano.log
# 输出: 520120

# 统计 Webhook 调用次数
grep -c "validatepod.volcano.sh" kube-apiserver-audit.volcano.log
# 输出: 515531

# 统计 Pod 创建成功/失败次数
grep -c "ResponseComplete.*pods.*create.*Success" kube-apiserver-audit.volcano.log
# 输出: 712
grep -c "ResponseComplete.*pods.*create.*Failure" kube-apiserver-audit.volcano.log
# 输出: 520518
```

错误日志示例：

```json
{
  "status": "Failure",
  "message": "Internal error occurred: failed calling webhook \"validatepod.volcano.sh\": failed to call webhook: Post \"https://volcano-admission-service.volcano-system.svc:443/pods/validate?timeout=10s\": context deadline exceeded",
  "reason": "InternalError",
  "code": 500
}
```

汇总统计表：

| 指标                         | 数量    | 比例    |
|------------------------------|---------|---------|
| **Pod 创建请求总数**         | 526,767 | 100%    |
| **创建成功**                 | 712     | 0.13%   |
| **创建失败**                 | 520,518 | 98.7%   |
| **Webhook 超时错误**         | 520,120 | 98.7%   |

**实验设计**：将 Webhook 超时时间从 10 秒增加到 30 秒：

```bash
# 批量修改 Webhook 配置中的超时
sed -i 's/timeoutSeconds: 10/timeoutSeconds: 30/g' schedulers/volcano/admission-service-*.yaml
```

**验证结果**：

- 在 Benchmark 3 与 4 中，Pod 创建数量由“<1000”恢复为“10000”；
- Pod 创建成功率从 1.3% 接近恢复到 100%；

对比图：

![Pod creation failure phenomenon in extreme cases due to Webhook timeout](/img/performance-tuning/pod-creation-failure-phenomenon.png)

![Pod Creation Restored After Fixing Webhook Timeout](/img/performance-tuning/pod-creation-restored-after-webhook-timeout.png)

#### 4.1.2 验证（自身开销）

即使解决了超时问题，Webhook 本身仍会引入 TLS、网络传输、序列化等开销。  
Volcano 的 Webhook 链路包括多类组件，每次 Pod 创建都要经过：

1. **Mutating Webhook**：修改 Pod/Job 等对象（如补充 `maxRetry`、`minAvailable` 等字段）；
2. **Validating Webhook**：校验配置合法性；
3. **Admission Service**：处理 Webhook 请求的服务；
4. **TLS 证书验证**：保证调用安全。

常见 Webhook 配置示例：

| 类型       | 名称                                     | 说明                      |
|------------|------------------------------------------|---------------------------|
| Mutating   | `volcano-admission-service-jobs-mutate`  | 修改 Job 配置             |
| Mutating   | `volcano-admission-service-podgroups-mutate` | 修改 PodGroup 配置    |
| Mutating   | `volcano-admission-service-pods-mutate`  | 修改 Pod 配置             |
| Mutating   | `volcano-admission-service-queues-mutate`| 修改 Queue 配置           |
| Validating | `volcano-admission-service-jobs-validate`| 校验 Job 配置合法性       |
| Validating | `volcano-admission-service-pods-validate`| 校验 Pod 配置合法性       |
| Validating | `volcano-admission-service-queues-validate` | 校验 Queue 配置       |

结合 Kubernetes 新版本能力，部分 Webhook 职责可以考虑迁移到：

1. **Controller 内部校验**：将必要的空指针/字段合法性校验下沉到 controller，以支持在简单场景下关闭部分 Webhook；
2. **CRD 校验规则（CEL）**：使用 K8s v1.29 起稳定的 `x-kubernetes-validations` 表达式对 CRD 进行校验，替代部分 Validating Webhook；
3. **预定义模板**：通过预配置 Job 模板减少运行时对对象的修改需求。

**实验结果**：对比开启 / 关闭 Webhook 的实验表明：

- 关闭 Webhook 后 Pod 创建与调度吞吐量显著提升；
- 以 `10000 Jobs × 1 Pod` 场景为例，总调度时间从约 250 秒降低到约 180 秒，吞吐量提升约 **30%**。

对比图如下：

![Before Optimization (Webhook Enabled)](/img/performance-tuning/before-optimization-webhook-enabled.png)

![After Optimization (Webhook Disabled)](/img/performance-tuning/after-optimization-webhook-disabled.png)

### 4.2 假设二：Controller Worker 线程需要调优

源码分析表明，`--worker-threads` 参数（默认 50）直接决定了 JobController 并发处理 **Job 请求** 的 goroutine 数量，其并非“越大越好”。

#### 4.2.1 创建逻辑与哈希分配

Worker 数配置入口：

```go
// cmd/controller-manager/app/server.go:134-139
func startControllers(config *rest.Config, opt *options.ServerOption) func(ctx context.Context) {
    ...
    controllerOpt.WorkerNum = opt.WorkerThreads
    ...
}
```

Job 被映射到具体 worker 的逻辑：

```go
// pkg/controllers/job/job_controller.go:318-333
func (cc *jobcontroller) belongsToThisRoutine(key string, count uint32) bool {
    val := cc.genHash(key)
    return val % cc.workers == count
}

func (cc *jobcontroller) getWorkerQueue(key string) workqueue.TypedRateLimitingInterface[any] {
    val := cc.genHash(key)
    queue := cc.queueList[val%cc.workers]
    return queue
}

func (cc *jobcontroller) genHash(key string) uint32 {
    hashVal := fnv.New32() // FNV-1a 非加密 hash
    hashVal.Write([]byte(key))
    return hashVal.Sum32()
}
```

该 FNV 哈希机制的作用：

1. **保证单 Job 串行**：相同 Job Key 总是路由到同一个 worker，避免多个 goroutine 并发修改同一 Job 导致的版本冲突、重复创建等问题；
2. **负载均衡**：不同 Job 均匀分布到 `workers` 个队列中，提高并发度。

Pod 创建逻辑简要片段：

```go
// pkg/controllers/job/job_controller_actions.go
func (cc *jobcontroller) syncJob(jobInfo *apis.JobInfo, updateStatus state.UpdateStatusFn) error {
    ...
    waitCreationGroup := sync.WaitGroup{}
    ...
    for _, ts := range job.Spec.Tasks {
        for i := 0; i < int(ts.Replicas); i++ {
            ...
            newPod := createJobPod(job, tc, ts.TopologyPolicy, i, jobForwarding)
            ...
            podToCreateEachTask = append(podToCreateEachTask, newPod)
            waitCreationGroup.Add(1)
            ...
        }
        podToCreate[ts.Name] = podToCreateEachTask
    }
    ...
    for taskName, podToCreateEachTask := range podToCreate {
        go func(taskName string, podToCreateEachTask []*v1.Pod) {
            ...
            for _, pod := range podToCreateEachTask {
                go func(pod *v1.Pod) {
                    defer waitCreationGroup.Done()
                    kubeClient.CoreV1().Pods(...).Create(...)
                }(pod)
            }
        }(taskName, podToCreateEachTask)
    }
    ...
    waitCreationGroup.Wait() // 等待所有 Pod 创建完成后才返回
    ...
}
```

> 观察：同一 Job 内所有 Pod 必须在一个批次内被创建完成，`Wait()` 导致处理该 Job 的 worker goroutine 在此期间无法服务其他 Job，成为潜在瓶颈。

#### 4.2.2 实验设计与 V 型曲线

**实验设置：**

- `worker-threads` 取值：1、5、10、25、50、100、150、200、400、600；
- Job/Pod 组合：  
  10000×1、5000×2、2000×5、1000×10、500×20、200×50、100×100、50×200、20×500、1×10000；
- 指标：从测试开始到最后一个 CREATE / SCHEDULE 事件完成所需时间。

**关键结论：**

- 在固定 worker 数的情况下，Job 数越多，`CREATE` 总时长普遍增加——验证了 Job 数量对 Controller 侧计算负载的线性影响；
- 在固定 Job 数的情况下，随着 `worker-threads` 增加，`CREATE` 时长呈现明显的 **“V 型”变化**：先下降，再上升。

![V-Shaped CREATE Time with Different Worker Threads](/img/performance-tuning/v-shaped-performance-curve-worker-threads.png)

**V 型曲线原因分析：**

- 左侧（线程数过少）：
  - 无法充分利用 CPU，I/O 等待成为瓶颈；
  - API-Server 与 ETCD 远程 I/O 成为主要限制；
  - 适当增加线程数可以更好利用算力，平摊等待时间。
- 右侧（线程数过多）：
  - CPU 与 API-Server 都被大量并发请求压满；
  - Job 之间的 Pod 创建请求交错排队，导致所有 Job 的尾部 Pod 拉长，总体时间变长；
  - 过多线程放大了排队与重试的放大效应。

### 4.3 假设三：Controller 与 Scheduler 的资源争用

观察到一个稳定现象：`CREATE`（Controller）与 `SCHEDULE`（Scheduler）两条曲线的“阶梯停顿”**从不同时发生**。进一步分析表明，本质原因在于二者作为两个独立组件，在高并发下对 **K8s API-Server/ETCD** 产生共享写入争用。

源码上，二者互相独立：

```go
// Controller 负责 Pod 创建
func (cc *jobcontroller) syncJob(...) error {
    for _, pod := range podToCreateEachTask {
        go func(pod *v1.Pod) {
            defer waitCreationGroup.Done()
            newPod, err := cc.kubeClient.CoreV1().Pods(pod.Namespace).Create(...)
            ...
        }(pod)
    }
    waitCreationGroup.Wait()
}

// Scheduler 负责调度绑定
func (alloc *Action) Execute(ssn *framework.Session) {
    for _, task := range tasks {
        ssn.Bind(task, node)
    }
}
```

真正的争用发生在 API-Server 层：

```go
// Controller 提交 Pod 创建
JobController.syncJob()
  → kubeClient.CoreV1().Pods().Create()
    → kube-apiserver
      → ETCD 写入

// Scheduler 提交调度结果
VolcanoScheduler.allocate()
  → ssn.Bind()
    → kubeClient.CoreV1().Pods().Update()
      → kube-apiserver
        → ETCD 写入
```

在 Job 数多、Pod 数大的场景下：

- Controller 侧的 Pod Create 请求被切分为多个小批次；
- 这些小批次之间的“空档”会被 Scheduler 侧的 Update 请求填充；
- 同时，JobController 中 `waitCreationGroup.Wait()` 的阻塞，使得尾部少量 Pod 的排队与重试会被放大成整体“停顿”；
- 资源更新还会触发对 PodGroup / Job 的频繁更新，加剧乐观锁冲突与重试。

宏观表现为：`CREATE` 与 `SCHEDULE` 吞吐曲线呈现“此起彼伏”的反相波动，但几乎不会同时进入低谷：

![CREATE/SCHEDULE Cumulative Pod Counts Show Alternating Stair-Steps](/img/performance-tuning/stair-step-stall-phenomenon.png)

![CREATE/SCHEDULE Throughput Fluctuates Inversely](/img/performance-tuning/create-schedule-throughput-fluctuating-inversely.png)

### 4.4 其他假设：被排除的因素

我们还验证了其他潜在影响因素，结果表明：

- `enqueue` 调度阶段；
- Volcano 版本差异；

并不是导致上述性能问题的核心原因。

#### 4.4.1 enqueue 阶段验证

enqueue 负责：

- Job 入队与队列管理；
- 按优先级与提交时间排序；
- 粗略资源检查；
- 队列容量控制等。

虽然 enqueue 有可能通过限制入队速率影响 CREATE 曲线，但实验证明：

```bash
# 在调度器配置中关闭 enqueue
actions: "allocate, backfill, reclaim"  # 原为: "enqueue, allocate, backfill"
```

关闭 enqueue 后：

- CREATED 曲线“阶梯式冲高–停顿”的现象依旧存在；
- 总体调度性能无显著改善；

因此，enqueue 不是核心瓶颈。

#### 4.4.2 版本差异验证

我们将 Volcano 从 v1.11.0 升级到 v1.12.0-alpha.0：

```bash
sed -i 's/v1\.11\.0/v1.12.0-alpha.0/g' schedulers/volcano/*/deployment.yaml
sed -i 's/v1\.11\.0/v1.12.0-alpha.0/g' schedulers/volcano/*/job.yaml
```

实验发现：

- 升级后测试结果与之前一致；
- CREATED 曲线异常现象仍然存在；

说明版本差异并非根因，核心瓶颈仍在前述链路。

## 5. 调优建议与展望

### 5.1 短期优化方案

1. **调整 Webhook 超时**  
   在 `volcano-admission-service` 的 deployment 中，将 Webhook 的 `timeoutSeconds` 从默认的 `10` 调整为 `30` 或更高，以避免大规模场景下的超时失败。

2. **为 Webhook 分配足够资源**  
   为 `volcano-admission` Pod 提供更高的 CPU/内存配额（可参考“华为云 – Volcano Scheduler – 资源推荐”），例如在 1000+ 节点集群中配置：
   - CPU：`request: 2500m`，`limit: 4000m` 或更高；
   - Memory：`request: 4Gi`，`limit: 5Gi` 或更高。

   资源推荐规则示意：

   - 节点数 < 100：默认配置（CPU request 500m / limit 2000m，内存 request 500Mi / limit 2000Mi）通常足够；
   - 节点数 ≥ 100：每增加 100 个节点（或 1 万个 Pod），建议：
     - CPU request 增加 500m，limit 比 request 高 1500m；
     - Memory request 增加 1000Mi，limit 比 request 高 1000Mi。

   简化公式（示例）：

   - CPU Request：可根据“节点数 × 目标 Pod 规模”，与推荐表插值后向上取整；
   - Memory Request：每 1000 节点约 2.4Gi，每 1 万 Pod 约 1Gi。

3. **合理配置 Controller Worker 线程数**  
   根据集群规模与 Job 模式（Job 数/每 Job Pod 数）调整 `volcano-controller-manager` 的 `--worker-threads`：
   - Job 数较少、单 Job Pod 数极大：不宜设置过高，以免放大 API-Server 争用；
   - Job 数较多（>500）：建议适当提高，如 100–200 范围，并结合实际压测寻找 V 型曲线的“谷底”。

### 5.2 中长期优化方向

1. **弱化 Webhook 依赖**  
   将部分逻辑下沉到 Controller 或使用 K8s CRD 校验（CEL），减少 Admission Webhook 的 RPC 开销与复杂链路依赖。

2. **协调 Controller 与 Scheduler 的速率**  
   设计一种动态的速率匹配机制，使 CREATE 与 SCHEDULE 的请求速率更均衡，避免“某一方拉满、另一方被阻”的交替抖动；  
   通过全局视角做速率控制，而不是单纯地优化某一阶段的局部性能。

