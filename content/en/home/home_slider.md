+++
# Hero Carousel widget.
widget = "slider"
active = true
date = 2017-10-15T00:00:00

# Order that this section will appear in.
weight = 1

# Slide interval.
# Use `false` to disable animation or enter a time in ms, e.g. `5000` (5s).
interval = 6000

# Minimum slide height.
# Specify a height to ensure a consistent height for each slide.
height = "350px"

# Slides.
# Duplicate an `[[item]]` block to add more slides.
[[item]]
  title = "Volcano"
  content = "Erupt with Computing Power <br /> <a class=\"github-button\" href=\"https://github.com/volcano-sh/volcano\" data-icon=\"octicon-star\" data-size=\"large\" data-show-count=\"true\" aria-label=\"Star this on GitHub\">Star</a>"
  align = "center"  # Choose `center`, `left`, or `right`.

  # Overlay a color or image (optional).
  #   Deactivate an option by commenting out the line, prefixing it with `#`.
  overlay_color = "#666"  # An HTML color value.
  overlay_img = "headers/volcano-slide-1.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.01  # Darken the image. Value in range 0-1.

  # Call to action button (optional).
  #   Activate the button by specifying a URL and button label below.
  #   Deactivate by commenting out parameters, prefixing lines with `#`.
  cta_label = "Learn More About Volcano"
  cta_url = "/en/docs/"
  cta_icon_pack = "fas"
  cta_icon = "graduation-cap"

[[item]]
  title = "Deploy High Performance Workloads effortlessly in Kubernetes"
  content = "Convert domain specific jobs to k8s workloads and Schedules the jobs in batches for optimal performance."
  align = "right"

  #overlay_color = "#555"  # An HTML color value.
  overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  #overlay_img = "headers/header-edge-2.jpg"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.15  # Darken the image. Value in range 0-1.

[[item]]
  title = "Efficient Scheduling"
  content = "Co-scheduling, Fair-Share, Gang scheduling, Topologies, Reserve/BackFill, Data ware Scheduling"
  align = "center"

  overlay_color = "#333"  # An HTML color value.
  overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.20  # Darken the image. Value in range 0-1.
  
[[item]]
  title = "Job Management"
  content = "Manages jobs with multiple template......"
  align = "center"

  overlay_color = "#333"  # An HTML color value.
  overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.25  # Darken the image. Value in range 0-1.

[[item]]
  title = "Multiple Runtime"
  content = "Singularity and GPU Accelerators"
  align = "center"

  overlay_color = "#333"  # An HTML color value.
  overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.35  # Darken the image. Value in range 0-1.

[[item]]
  title = "Extensive Observability"
  content = "Logging, Metric & Dashboard"
  align = "center"

  overlay_color = "#333"  # An HTML color value.
  overlay_img = "headers/volcano-slide-2.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.45  # Darken the image. Value in range 0-1.

+++

<div class="mt-3">
  <a class="github-button" href="https://github.com/volcano-sh/volcano" data-icon="octicon-star" data-size="large" data-show-count="true" aria-label="Star this on GitHub">Star</a>
</div>
<script async defer src="https://buttons.github.io/buttons.js"></script>