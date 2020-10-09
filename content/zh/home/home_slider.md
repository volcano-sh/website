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
interval = 6000

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
  title = "高性能调度"
  content = "将特定领域作业转化为Kubernetes负载，并以绝佳的性能进行调度"
  align = "left"

  #overlay_color = "#555"  # An HTML color value.
  # overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  # #overlay_img = "headers/header-edge-2.jpg"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.15  # Darken the image. Value in range 0-1.

[[item]]
  title = "多种调度策略"
  content = "Co-scheduling, Fair-Share, Gang scheduling, Topologies, Reserve/BackFill, Data-aware Scheduling等"
  align = "left"

 #  overlay_color = "#333"  # An HTML color value.
 #  overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.20  # Darken the image. Value in range 0-1.
  
[[item]]
  title = "增强的Job管理"
  content = "多模板Job管理"
  align = "left"

 #  overlay_color = "#333"  # An HTML color value.
  # overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.25  # Darken the image. Value in range 0-1.

[[item]]
  title = "多运行时支持"
  content = "Singularity和GPU加速器"
  align = "left"

  # overlay_color = "#333"  # An HTML color value.
  # overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.35  # Darken the image. Value in range 0-1.

[[item]]
  title = "丰富的监控手段"
  content = "日志、监控指标和仪表盘等"
  align = "left"

  # overlay_color = "#333"  # An HTML color value.
  # overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.45  # Darken the image. Value in range 0-1.

+++

<div class="mt-3">
  <a class="github-button" href="https://github.com/volcano-sh/volcano" data-icon="octicon-star" data-size="large" data-show-count="true" aria-label="Star this on GitHub">Star</a>
</div>
<script async defer src="https://buttons.github.io/buttons.js"></script>