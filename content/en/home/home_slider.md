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
interval = 600000

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
  title = "High Performance Powered by Efficient Scheduling"
  content = "Computing jobs can be converted to Kubernetes workloads and scheduled in batches to deliver optimal performance."
  align = "left"
  #overlay_color = "#555"  # An HTML color value.
  #overlay_img = "headers/banner_02.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.05  # Darken the image. Value in range 0-1.

[[item]]
  title = "Diverse Scheduling Policies"
  content = "Co-scheduling, fair-share scheduling, gang scheduling, topologies, reservation/backfill, data-aware scheduling, and more"
  align = "left"
  #overlay_color = "#333"  # An HTML color value.
  #overlay_img = "headers/banner_02.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.05  # Darken the image. Value in range 0-1.
  
[[item]]
  title = "Enhanced Job Management"
  content = "Managing jobs with multiple templates"
  align = "left"
  #overlay_color = "#333"  # An HTML color value.
  #overlay_img = "headers/banner_02.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.05  # Darken the image. Value in range 0-1.

[[item]]
  title = "Multiple Runtimes"
  content = "Singularity and GPU Accelerators"
  align = "left"
  #overlay_color = "#333"  # An HTML color value.
  #overlay_img = "headers/banner_02.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.15  # Darken the image. Value in range 0-1.

[[item]]
  title = "Powerful Monitoring"
  content = "Logging, metrics, and dashboard"
  align = "left"
  #overlay_color = "#333"  # An HTML color value.
  #overlay_img = "headers/banner_02.png"  # Image path relative to your `static/img/` folder.
  overlay_filter = 0.15 # Darken the image. Value in range 0-1.

+++

<!-- <div class="mt-3">
  <a class="github-button" href="https://github.com/volcano-sh/volcano" data-icon="octicon-star" data-size="large" data-show-count="true" aria-label="Star this on GitHub">Star</a>
</div>
<script async defer src="https://buttons.github.io/buttons.js"></script>
 -->