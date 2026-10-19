---
title: "如何在 Volcano 调度器中启用动态资源分配 (DRA)"

---


本文档描述了在 Volcano 调度器中启用动态资源分配 (DRA) 支持所需的步骤。

## 前提条件
在执行配置步骤之前，请确保您的集群满足以下前提条件：

### 配置集群节点 (Containerd)
对于使用 containerd 作为容器运行时的节点，您必须启用容器设备接口 (CDI) 功能。
这一点至关重要，因为它能确保 containerd 能够正确地与 DRA 驱动程序交互，并将动态资源注入到 Pod 中。

请修改每个节点上的 containerd 配置文件（通常位于 `/etc/containerd/config.toml`），确保其中包含以下配置项：
```toml
# 按照以下链接中的说明启用 CDI：
# https://tags.cncf.io/container-device-interface#containerd-configuration
[plugins."io.containerd.grpc.v1.cri"]
enable_cdi = true
cdi_spec_dirs = ["/etc/cdi", "/var/run/cdi"]
```
修改配置后，请重启每个节点上的 containerd 服务，以使更改生效。例如：`sudo systemctl restart containerd`

> 如果您使用的是其他容器运行时，请参考：[how-to-configure-cdi](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi)

## 1. 配置 Kube-apiserver
DRA 相关的 API 属于 Kubernetes 的内置资源，而非 CRD 资源。在 v1.32 版本中，这些资源默认并未注册。
因此，您需要通过设置 kube-apiserver 的启动参数来手动注册这些 DRA 相关的 API。请在您的 kube-apiserver 清单文件（manifest）或配置文件中，添加或确保包含以下标志（flag）：
```yaml
--runtime-config=resource.k8s.io/v1beta1=true
```

## 2. 安装并启用 DRA 特性门的 Volcano
在安装 Volcano 时，您需要启用与 DRA 相关的特性门（feature gates）。例如，若需使用 DRA 功能，必须启用 `DynamicResourceAllocation` 特性门；
此外，您也可以根据自身需求，选择启用 `DRAAdminAccess` 特性门以便进行设备管理。

若使用 Helm 安装 Volcano，可执行以下命令来安装并启用 DRA 特性门：
```bash
helm install volcano volcano/volcano --namespace volcano-system --create-namespace \
--set custom.scheduler_feature_gates="DynamicResourceAllocation=true" \
# 根据您的安装需求，添加其他必要的 Helm 配置值
```

若直接使用 `kubectl apply -f` 命令安装 Volcano，请在您的 volcano-scheduler 清单文件中，添加或确保包含以下标志：
```yaml
--feature-gates=DynamicResourceAllocation=true
```

## 3. 配置 Volcano 调度器插件
安装 Volcano 之后，您需要调整 Volcano 调度器的插件配置，在 `predicates` 插件的参数列表中启用 DRA 插件。

请找到您的 Volcano 调度器配置文件（该配置通常存储在一个 ConfigMap 对象中）。定位到 `predicates` 插件的配置部分，并通过添加或修改其参数来启用 D​​RA 插件。调度器配置的一个示例片段（位于 ConfigMap 的 `volcano-scheduler.conf` 键下）可能如下所示：
```yaml
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
- name: priority
- name: gang
- plugins:
- name: drf
- name: predicates
arguments:
predicate.DynamicResourceAllocationEnable: true
- name: proportion
- name: nodeorder
- name: binpack
```

## 4. 部署 DRA 驱动
若要使用动态资源分配（Dynamic Resource Allocation）功能，您需要在集群中部署一个 DRA 驱动。该驱动负责管理动态资源的生命周期。
例如，您可以参考 [kubernetes-sigs/dra-example-driver](https://github.com/kubernetes-sigs/dra-example-driver) 来部署一个示例 DRA 驱动以进行测试。

对于一些已在实际生产环境中投入使用的 DRA 驱动，您可以参考：
- [NVIDIA/k8s-dra-driver-gpu](https://github.com/NVIDIA/k8s-dra-driver-gpu)
- [intel/intel-resource-drivers-for-kubernetes](https://github.com/intel/intel-resource-drivers-for-kubernetes)