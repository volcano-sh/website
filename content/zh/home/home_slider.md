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
  #content = "让算力爆发 <br /> <a class=\"github-button\" href=\"https://github.com/volcano-sh/volcano\" data-icon=\"octicon-star\" data-size=\"large\" data-show-count=\"true\" aria-label=\"Star this on GitHub\" background-color=\"red\"  >Star</a>"
  content = "基于Kubernetes的高性能工作负载调度引擎"
  content1 = "<a class=\"github-button\" href=\"https://github.com/volcano-sh/volcano\"  data-size=\"large\" data-icon=\"octicon-star\" data-show-count=\"true\" aria-label=\"Star this on GitHub\"  >Star</a>"
  align = "left"  # Choose `center`, `left`, or `right`.

  # Overlay a color or image (optional).
  #   Deactivate an option by commenting out the line, prefixing it with `#`.
  # overlay_color = "#666"  # An HTML color value.
  # overlay_img = "headers/volcano-slide-1.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.01  # Darken the image. Value in range 0-1.

  # Call to action button (optional).
  #   Activate the button by specifying a URL and button label below.
  #   Deactivate by commenting out parameters, prefixing lines with `#`.
  cta_label = "深入了解Volcano"
  cta_url = "docs/"
  cta_icon_pack = "fas"
  cta_icon = "graduation-cap"

[[item]]
  title = "网络拓扑感知调度"
  content = "支持网络拓扑感知调度，显著降低跨节点间的应用通信开销，在AI分布式训练场景中大幅提升模型训练效率"
  align = "left"

  overlay_filter = 0.15

[[item]]
  title = "在离线混部"
  content = "支持在线和离线业务混合部署，通过统一调度，动态资源超卖，CPU Burst，资源隔离等能力，提升资源利用率的同时保障在线业务QoS"
  align = "left"

 #  overlay_color = "#333"  # An HTML color value.
 #  overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.20  # Darken the image. Value in range 0-1.
  
[[item]]
  title = "多集群作业调度"
  content = "支持作业跨集群调度，实现更大规模的资源池管理和负载均衡"
  content1 = "<a class=\"github-button\" href=\"https://github.com/volcano-sh/volcano-global\" data-size=\"large\" data-icon=\"octicon-star\" data-show-count=\"true\" aria-label=\"Star this on GitHub\">Star</a>"
  align = "left"
  overlay_filter = 0.25

  # Call to action button for multi-cluster scheduling
  cta_label = "深入了解Volcano多集群调度"
  cta_url = "https://github.com/volcano-sh/volcano-global"
  cta_icon_pack = "fas"
  cta_icon = "graduation-cap"

[[item]]
  title = "层级队列管理"
  content = "支持多层级队列管理，实现更精细的资源配额控制"
  align = "left"

  overlay_filter = 0.3

[[item]]
  title = "负载感知重调度"
  content = "支持负载感知重调度，优化集群负载分布，提升系统稳定性"
  content1 = "<a class=\"github-button\" href=\"https://github.com/volcano-sh/descheduler\" data-size=\"large\" data-icon=\"octicon-star\" data-show-count=\"true\" aria-label=\"Star this on GitHub\">Star</a>"
  align = "left"

  # overlay_color = "#333"  # An HTML color value.
  # overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.35  # Darken the image. Value in range 0-1.

  # Call to action button for descheduling
  cta_label = "深入了解Volcano重调度"
  cta_url = "https://github.com/volcano-sh/descheduler"
  cta_icon_pack = "fas"
  cta_icon = "graduation-cap"

[[item]]
  title = "多种调度策略"
  content = "支持 Gang、Fair-Share、Binpack、DeviceShare、Capacity、Proportion、NUMA aware、Task Topology等多种调度策略，优化资源利用效率"
  align = "left"

  # overlay_color = "#333"  # An HTML color value.
  # overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.4  # Darken the image. Value in range 0-1.

[[item]]
  title = "异构设备支持"
  content = "支持 GPU、NPU 等多种异构设备的调度，释放硬件算力"
  align = "left"
  overlay_filter = 0.45

[[item]]
  title = "高性能统一调度"
  content = "支持Kubernetes原生负载调度，同时通过VolcanoJob为Ray、PyTorch、TensorFlow、Spark、Flink等框架提供完整支持，以绝佳性能实现作业统一调度。"
  align = "left"  
  overlay_filter = 0.5

[[item]]
  title = "可观测性"
  content = "提供丰富的日志、监控指标和Dashboard等"
  content1 = "<a class=\"github-button\" href=\"https://github.com/volcano-sh/dashboard\" data-size=\"large\" data-icon=\"octicon-star\" data-show-count=\"true\" aria-label=\"Star this on GitHub\">Star</a>"
  align = "left"

  # overlay_color = "#333"  # An HTML color value.
  # overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.55  # Darken the image. Value in range 0-1.

  # Call to action button for observability
  cta_label = "深入了解Volcano Dashboard"
  cta_url = "https://github.com/volcano-sh/dashboard"
  cta_icon_pack = "fas"
  cta_icon = "graduation-cap"

+++

<div class="mt-3">
  <a class="github-button" href="https://github.com/volcano-sh/volcano" data-icon="octicon-star" data-size="large" data-show-count="true" aria-label="Star this on GitHub">Star</a>
</div>
<script async defer src="https://buttons.github.io/buttons.js"></script>