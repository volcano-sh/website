++
title = "如何在 Volcano 调度器中启用动态资源分配 (DRA)"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_enable_dra/"
[menu.docs]
  parent = "user-guide"
++

本文介绍在 Volcano 调度器中启用 **Dynamic Resource Allocation (DRA)** 支持所需的步骤。

## 前置条件

在进行配置之前，请确保集群满足以下前置条件。

### 配置集群节点（containerd 场景）

对于使用 containerd 作为容器运行时的节点，需要启用 **Container Device Interface (CDI)** 功能，使 containerd 能正确与 DRA 驱动交互，并将动态资源注入到 Pod 中。

在每个节点上修改 containerd 配置文件（通常为 `/etc/containerd/config.toml`），确保包含如下配置：

```toml
# Enable CDI as described in
# https://tags.cncf.io/container-device-interface#containerd-configuration
[plugins."io.containerd.grpc.v1.cri"]
  enable_cdi = true
  cdi_spec_dirs = ["/etc/cdi", "/var/run/cdi"]
```

修改完成后，重启每个节点上的 containerd 服务以生效，例如：

```bash
sudo systemctl restart containerd
```

> 如果使用其他容器运行时，请参考：[how-to-configure-cdi](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi)

## 1. 配置 kube-apiserver

DRA 相关 API 是 Kubernetes 内置资源，而**在 v1.32 中默认并不会注册这些资源**。因此需要在 kube‑apiserver 的启动参数中显式开启对应的 API：

在 kube‑apiserver 的 manifest 或配置中添加（或确认已经存在）如下参数：

```yaml
--runtime-config=resource.k8s.io/v1beta1=true
```

## 2. 在安装 Volcano 时启用 DRA 特性开关

安装 Volcano 时，需要开启与 DRA 相关的 feature gate。例如，当需要使用 DRA 功能时必须启用 `DynamicResourceAllocation`，也可以视需求启用 `DRAAdminAccess` 以管理设备。

### 使用 Helm 安装 Volcano

如果通过 Helm 安装 Volcano，可以使用以下命令启用 DRA feature gate：

```bash
helm install volcano volcano/volcano --namespace volcano-system --create-namespace \
  --set custom.scheduler_feature_gates="DynamicResourceAllocation=true" \
  # 根据实际情况添加其他 Helm 参数
```

### 使用 `kubectl apply -f` 安装 Volcano

如果直接使用 YAML 清单安装 Volcano，需要在 `volcano-scheduler` 的启动参数中添加（或确认已经存在）如下参数：

```yaml
--feature-gates=DynamicResourceAllocation=true
```

## 3. 配置 Volcano 调度器插件

安装完成后，需要在 Volcano 调度器配置中启用 DRA 相关插件。通常是在 `predicates` 插件的参数中开启 DRA。

找到集群中的调度器配置（一个包含 `volcano-scheduler.conf` 的 ConfigMap），在其中找到 `predicates` 插件配置，并添加/修改参数以启用 DRA：

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
      predicate.DynamicResourceAllocationEnable: true  # 启用 DRA 支持
  - name: proportion
  - name: nodeorder
  - name: binpack
```

## 4. 部署 DRA 驱动

要真正使用动态资源分配，需要在集群中部署一个 **DRA 驱动（Driver）**。Driver 负责管理动态资源的生命周期。

测试场景下，可以参考官方示例：

- 示例 DRA 驱动：[kubernetes-sigs/dra-example-driver](https://github.com/kubernetes-sigs/dra-example-driver)

在实际生产中可以使用已经落地的 DRA 驱动，例如：

- GPU 场景：[NVIDIA/k8s-dra-driver-gpu](https://github.com/NVIDIA/k8s-dra-driver-gpu)
- 其他硬件资源：[intel/intel-resource-drivers-for-kubernetes](https://github.com/intel/intel-resource-drivers-for-kubernetes)

