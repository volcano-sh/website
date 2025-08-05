import React from "react";
import SectionContainer from "../SectionContainer";
import Translate from "@docusaurus/Translate";
import "./styles.css";

const reasons = [
  {
    title: <Translate>Unified Scheduling</Translate>,
    content: (
      <>
        <Translate>Supports integrated job scheduling for both Kubernetes native workloads and mainstream computing frameworks (such as TensorFlow, Spark, PyTorch, Ray, Flink, etc.).</Translate>
      </>
    ),
  },
  {
    title: <Translate>Queue Management</Translate>,
    content: (
      <>
        <Translate>Provides multi-level queue management capabilities, enabling fine-grained resource quota control and task priority scheduling.</Translate>
      </>
    ),
  },
  {
    title: <Translate>Heterogeneous Device Support</Translate>,
    content: (
      <>
        <Translate>Efficiently schedules heterogeneous devices like GPU and NPU, fully unleashing hardware computing potential.</Translate>
      </>
    ),
  },
  {
    title: <Translate>Network Topology Aware Scheduling</Translate>,
    content: (
      <>
        <Translate>Greatly enhancing model training efficiency in AI distributed training scenarios.</Translate>
      </>
    ),
  },
  {
    title: <Translate>Multi-cluster Scheduling</Translate>,
    content: (
      <>
        <Translate>Supports cross cluster job scheduling, improving resource pool management capabilities and achieving large scale load balancing.</Translate>
      </>
    ),
  },
  {
    title: <Translate>Online and Offline Workloads Colocation</Translate>,
    content: (
      <>
        <Translate>Enables online and offline workloads colocation, improving cluster resource utilization through intelligent colocation scheduling.</Translate>
      </>
    ),
  },
  {
    title: <Translate>Load Aware Descheduling</Translate>,
    content: (
      <>
        <Translate>Optimizing cluster load distribution and enhancing system stability.</Translate>
      </>
    ),
  },
  {
    title: <Translate>Multiple Scheduling Policies</Translate>,
    content: (
      <>
        <Translate>Supports various scheduling strategies such as Gang scheduling, Fair-Share, Binpack, DeviceShare, NUMA-aware scheduling, Task Topology, etc.</Translate>
      </>
    ),
  },
];

export default function Why() {
  return (
    <SectionContainer className="whyContainer">
      <h1>
        <Translate>Why Volcano</Translate>
      </h1>
      <div className="reasonBoxContainer">
        {reasons.map((item, index) => (
          <div key={index} className="reasonBox">
            <p className="reasonTitle">{item.title}</p>
            <div className="reasonContent">{item.content}</div>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
