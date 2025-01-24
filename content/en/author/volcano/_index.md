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
  link = "https://twitter.com/volcano_sh"

+++
<div class="about-volcano">
  <div class="feature-list">
    <a href="/en/docs/unified_scheduling/" class="feature-item">
      <h3>Unified Scheduling</h3>
      <p>Supports integrated job scheduling for both Kubernetes native workloads and mainstream computing frameworks (such as TensorFlow, Spark, PyTorch, Ray, Flink, etc.).</p>
    </a>
    <a href="/en/docs/queue_resource_management/" class="feature-item">
      <h3>Queue Management</h3>
      <p>Provides multi-level queue management capabilities, enabling fine-grained resource quota control and task priority scheduling.</p>
    </a>
    <a href="#" class="feature-item">
      <h3>Heterogeneous Device Support</h3>
      <p>Efficiently schedules heterogeneous devices like GPU and NPU, fully unleashing hardware computing potential.</p>
    </a>
    <a href="/en/docs/network_topology_aware_scheduling/" class="feature-item">
      <h3>Network Topology Aware Scheduling</h3>
      <p>Greatly enhancing model training efficiency in AI distributed training scenarios.</p>
    </a>
    <a href="/en/docs/multi_cluster_scheduling/" class="feature-item">
      <h3>Multi-cluster Scheduling</h3>
      <p>Supports cross cluster job scheduling, improving resource pool management capabilities and achieving large scale load balancing.</p>
    </a>
    <a href="/en/docs/colocation/" class="feature-item">
      <h3>Online and Offline Workloads Colocation</h3>
      <p>Enables online and offline workloads colocation, improving cluster resource utilization through intelligent scheduling strategies.</p>
    </a>
    <a href="/en/docs/descheduler/" class="feature-item">
      <h3>Load Aware Descheduling</h3>
      <p>Optimizing cluster load distribution and enhancing system stability.</p>
    </a>
    <a href="#" class="feature-item">
      <h3>Multiple Scheduling Policies</h3>
      <p>Supports various scheduling strategies such as Gang scheduling, Fair-Share, Binpack, DeviceShare, NUMA-aware scheduling, Task Topology, etc.</p>
    </a>
  </div>
</div>
