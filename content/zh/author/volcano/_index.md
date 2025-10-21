+++
# Display name
name = "Volcano"

# Is this the primary user of the site?
superuser = true

# Organizations/Affiliations
#   Separate multiple entries with a comma, using the form: `[ {name="Org1", url=""}, {name="Org2", url=""} ]`.
organizations = []

# Short bio (displayed in user profile at end of posts)
# bio = "My research interests include distributed robotics, mobile computing and programmable matter."

# Enter email to display Gravatar (if Gravatar enabled in Config)
email = ""

# List (academic) interests or hobbies
interests = []

[[social]]
  icon = "/img/icon_email.svg"
  icon_pack = "fas"
  link = "#contact"  # For a direct email link, use "mailto:test@example.org".



 [[social]]
  icon = "/img/icon_github.svg"
  icon_pack = "fab"
  link = "https://github.com/volcano-sh/volcano"

#[[social]]
 # icon = "/img/google-scholar"
 # icon_pack = "ai"
 # link = "https://scholar.google.co.uk/citations?user=sIwtMXoAAAAJ"

[[social]]
  icon = "/img/icon_twitter.svg"
  icon_pack = "fab"
  link = "https://x.com/volcano_sh"

+++
<div class="about-volcano">
  <div class="feature-list">
    <a href="/zh/docs/unified_scheduling/" class="feature-item">
      <h3>统一调度</h3>
      <p>支持 Kubernetes 原生负载及主流计算框架（如 TensorFlow、Spark、PyTorch、Ray、Flink等）的一体化作业调度。</p>
    </a>
    <a href="/zh/docs/queue_resource_management/" class="feature-item">
      <h3>队列管理</h3>
      <p>提供多层级队列管理能力，实现精细化资源配额控制和任务优先级调度。</p>
    </a>
    <a href="#" class="feature-item">
      <h3>异构设备支持</h3>
      <p>高效调度GPU、NPU等异构设备，充分释放硬件算力潜力。</p>
    </a>
    <a href="/zh/docs/network_topology_aware_scheduling/" class="feature-item">
      <h3>网络拓扑感知</h3>
      <p>支持网络拓扑感知调度，显著降低跨节点间的应用通信开销，在AI分布式训练场景中大幅提升模型训练效率。</p>
    </a>
    <a href="/zh/docs/multi_cluster_scheduling/" class="feature-item">
      <h3>多集群调度</h3>
      <p>支持跨集群作业调度，提升资源池管理能力，实现大规模负载均衡。</p>
    </a>
    <a href="/zh/docs/colocation/" class="feature-item">
      <h3>在离线混部</h3>
      <p>实现在线与离线任务混合部署，提升集群资源利用率。</p>
    </a>
    <a href="/zh/docs/descheduler/" class="feature-item">
      <h3>负载感知重调度</h3>
      <p>支持负载感知重调度，优化集群负载分布，提升系统稳定性。</p>
    </a>
    <a href="#" class="feature-item">
      <h3>多种调度策略</h3>
      <p>支持 Gang、Fair-Share、Binpack、DeviceShare、Capacity、Proportion、NUMA aware、Task Topology等多种调度策略，优化资源利用效率。</p>
    </a>
  </div>
</div>
