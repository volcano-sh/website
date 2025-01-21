+++
# Hero Carousel widget.
widget = "slider"
active = true
date = 2017-10-15T00:00:00
lala = "headers/banner_02.png"

# Order that this section will appear in.
weight = 1

# Slide interval.
# Use `false` to disable animation or enter a time in ms, e.g. `5000` (5s).
interval = 5000

# Minimum slide height.
# Specify a height to ensure a consistent height for each slide.
height = "500px"

# Slides.
# Duplicate an `[[item]]` block to add more slides.
[[item]]
  title = "Volcano"
  #content = "Erupt with Computing Power <br /> <a class=\"github-button\" href=\"https://github.com/volcano-sh/volcano\" data-icon=\"octicon-star\" data-size=\"large\" data-show-count=\"true\" aria-label=\"Star this on GitHub\" background-color=\"red\"  >Star</a>"
  content = "Cloud native batch scheduling system for compute-intensive workloads"
  content1 = "<a class=\"github-button\" href=\"https://github.com/volcano-sh/volcano\"  data-size=\"large\" data-icon=\"octicon-star\" data-show-count=\"true\" aria-label=\"Star this on GitHub\"  >Star</a>"
  align = "left"  # Choose `center`, `left`, or `right`.

  # Overlay a color or image (optional).
  #   Deactivate an option by commenting out the line, prefixing it with `#`.
  #overlay_color = "#666"  # An HTML color value.
  #overlay_img = "headers/banner_02.png"  # Image path relative to your `static/img/` folder.
  #overlay_img = "headers/banner_02.png"
  overlay_filter = 0.00  # Darken the image. Value in range 0-1.

  # Call to action button (optional).
  #   Activate the button by specifying a URL and button label below.
  #   Deactivate by commenting out parameters, prefixing lines with `#`.
  cta_label = "Learn More About Volcano"
  cta_url = "docs/"
  cta_icon_pack = "fas"
  cta_icon = "graduation-cap"

[[item]]
  title = "Network Topology Aware Scheduling"
  content = "Supports network topology aware scheduling, significantly reducing application communication overhead between nodes, and greatly enhancing model training efficiency in AI distributed training scenarios"
  align = "left"
  overlay_filter = 0.15

[[item]]
  title = "Online and Offline Workloads Colocation"
  content = "Supports online and offline workloads colocation, enhancing resource utilization while ensuring online business QoS through unified scheduling, dynamic resource overcommitment, CPU burst capabilities, and resource isolation"
  align = "left"
  overlay_filter = 0.20

[[item]]
  title = "Multi Cluster Job Scheduling"
  content = "Supports cross cluster job scheduling for larger scale resource pool management and load balancing"
  content1 = "<a class=\"github-button\" href=\"https://github.com/volcano-sh/volcano-global\" data-size=\"large\" data-icon=\"octicon-star\" data-show-count=\"true\" aria-label=\"Star this on GitHub\">Star</a>"
  align = "left"
  overlay_filter = 0.25

  # Call to action button for multi-cluster scheduling
  cta_label = "Learn more about volcano multi-cluster scheduling"
  cta_url = "https://github.com/volcano-sh/volcano-global"
  cta_icon_pack = "fas"
  cta_icon = "graduation-cap"

[[item]]
  title = "Hierarchical Queue Management"
  content = "Supports multi-level queue management for fine-grained resource quota control"
  align = "left"
  overlay_filter = 0.3

[[item]]
  title = "Descheduling"
  content = "Supports dynamic descheduling to optimize cluster load distribution and improve system stability"
  content1 = "<a class=\"github-button\" href=\"https://github.com/volcano-sh/descheduler\" data-size=\"large\" data-icon=\"octicon-star\" data-show-count=\"true\" aria-label=\"Star this on GitHub\">Star</a>"
  align = "left"
  overlay_filter = 0.35

  # Call to action button for descheduling
  cta_label = "Learn more about volcano descheduling"
  cta_url = "https://github.com/volcano-sh/descheduler"
  cta_icon_pack = "fas"
  cta_icon = "graduation-cap"

[[item]]
  title = "Multiple Scheduling Policies"
  content = "Supports various scheduling strategies including Gang, Fair-Share, Binpack, DeviceShare, Capacity, Proportion, NUMA aware, and Task Topology, optimizing resource utilization"
  align = "left"
  overlay_filter = 0.4

[[item]]
  title = "Heterogeneous Device Support"
  content = "Supports scheduling for various heterogeneous devices like GPU and NPU, unleashing hardware computing power"
  align = "left"
  overlay_filter = 0.45

[[item]]
  title = "High Performance Unified Scheduling"
  content = "Supports native Kubernetes workload scheduling while providing complete support for frameworks like Ray, PyTorch, TensorFlow, Spark, and Flink through VolcanoJob, achieving unified job scheduling with excellent performance"
  align = "left"
  overlay_filter = 0.5

[[item]]
  title = "Powerful Monitoring"
  content = "Provides rich logging, monitoring metrics, and dashboards"
  content1 = "<a class=\"github-button\" href=\"https://github.com/volcano-sh/dashboard\" data-size=\"large\" data-icon=\"octicon-star\" data-show-count=\"true\" aria-label=\"Star this on GitHub\">Star</a>"
  align = "left"

  # overlay_color = "#333"  # An HTML color value.
  # overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.55  # Darken the image. Value in range 0-1.

  # Call to action button for observability
  cta_label = "Learn more about volcano dashboard"
  cta_url = "https://github.com/volcano-sh/dashboard"
  cta_icon_pack = "fas"
  cta_icon = "graduation-cap"

+++

<!-- <div class="mt-3">
  <a class="github-button" href="https://github.com/volcano-sh/volcano" data-icon="octicon-star" data-size="large" data-show-count="true" aria-label="Star this on GitHub">Star</a>
</div>
<script async defer src="https://buttons.github.io/buttons.js"></script>
 -->