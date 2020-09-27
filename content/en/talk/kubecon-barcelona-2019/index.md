+++
title = "Intro: Kubernetes Batch Scheduling"

# Talk start and end times.
#   End time can optionally be hidden by prefixing the line with `#`.
date = 2019-05-22T14:50:00
date_end = 2019-05-22T15:25:00
all_day = false

# Schedule page publish date (NOT talk date).
publishDate = 2019-06-06T00:00:00

# Authors. Comma separated list, e.g. `["Bob Smith", "David Jones"]`.
authors = ["Kevin Wang"]

# Location of event.
location = "Barcelona, Europe"
location_img = "/img/icon_location.png"
time_img = "/img/icon_time.png"

# Name of event and optional event URL.
event = "KubeCon Europe"
event_url = "https://kccnceu19.sched.com/event/ed36bb83476fce99a92e93f29965efea?iframe=no"

# Abstract. What's your talk about?
abstract = "Introducing Volcano : A Kubernetes Native Batch System for High Performance Workload"

# Summary. An optional shortened abstract.
summary = "Kubernetes started as a general purpose orchestration framework with a focus on serving jobs. But as it gains popularity, users want to run high performance workloads on Kubernetes, such as Spark, TensorFlow, etc. When running these workloads in Kubernetes, several advanced capability are required, e.g. fair-share sharing, queue, job management (suspend/resume), data management. This Intro will present the work in community to bring \"batch\" capability."

# Is this a featured talk? (true/false)
featured = false

# Tags (optional).
#   Set `tags = []` for no tags, or use the form `tags = ["A Tag", "Another Tag"]` for one or more tags.
tags = []

# Markdown Slides (optional).
#   Associate this talk with Markdown slides.
#   Simply enter your slide deck's filename without extension.
#   E.g. `slides = "example-slides"` references 
#   `content/slides/example-slides.md`.
#   Otherwise, set `slides = ""`.
#slides = "introducing-volcano"

# Optional filename of your slides within your talk folder or a URL.
url_slides = ""

# Projects (optional).
#   Associate this talk with one or more of your projects.
#   Simply enter your project's folder or file name without extension.
#   E.g. `projects = ["deep-learning"]` references 
#   `content/project/deep-learning/index.md`.
#   Otherwise, set `projects = []`.
# projects = ["internal-project"]

# Links (optional).
#url_pdf = "https://static.sched.com/hosted_files/kccna18/ae/Deep%20Dive_%20IoT%20Edge%20Working%20Group.pdf"
url_video = "https://www.youtube.com/watch?v=rpN9IsihEKI&feature=youtu.be"
url_code = ""

# Demo talk page uses LaTeX math.
math = true

# Featured image
# To use, add an image named `featured.jpg/png` to your page's folder. 
[image]
  # Caption (optional)
  caption = "Da Ma & Kevin Wang introducing Volcano at KubeCon Europe, 2019"

  # Focal point (optional)
  # Options: Smart, Center, TopLeft, Top, TopRight, Left, Right, BottomLeft, Bottom, BottomRight
  focal_point = "Right"
+++
## Introduction to Kubernetes Native Batch System 

Kubernetes started as a general purpose orchestration framework with a focus on serving jobs. But as it gains popularity, users want to run high performance workloads on Kubernetes, such as Spark, TensorFlow, etc. When running these workloads in Kubernetes, several advanced capability are required, e.g. fair-share sharing, queue, job management (suspend/resume), data management. This Intro will present the work in community to bring "batch" capability.

## Speakers  

### Da Ma (Kubernetes Maintainer, SIG-Scheduling Co-Leader, Volcano leader, Huawei)  

Kubernetes Maintainer, SIG-Scheduling Co-Leader, Volcano leader. Jilin University master’s degree, majoring in grid computing and distributed system. After graduation, he focus on resource management, resource scheduling in distributed system.

### Kevin Wang (Principal Engineer, Huawei)  

Zefeng(Kevin) Wang is a Principal Engineer of the PaaS Team at Huawei. Currently working on Kubernetes, KubeEdge and Huawei Cloud container products. He is the lead of Huawei Kubernetes & Cloud Native open source team and co-founder of KubeEdge project.