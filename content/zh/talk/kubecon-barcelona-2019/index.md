+++
title = "简介: Kubernetes批量调度"

# Talk start and end times.
#   End time can optionally be hidden by prefixing the line with `#`.
date = 2019-05-22T14:50:00
date_end = 2019-05-22T15:25:00
all_day = false

# Schedule page publish date (NOT talk date).
publishDate = 2019-06-06T00:00:00

# Authors. Comma separated list, e.g. `["Bob Smith", "David Jones"]`.
authors = ["王泽锋"]

# Location of event.
location = "巴塞罗那, 欧洲"
location_img = "/img/icon_location.svg"
time_img = "/img/icon_time.svg"

# Name of event and optional event URL.
event = "KubeCon欧洲峰会"
event_url = "https://kccnceu19.sched.com/event/ed36bb83476fce99a92e93f29965efea?iframe=no"

# Abstract. What's your talk about?
abstract = "Volcano介绍：一个用于高性能工作负载场景下基于Kubernetes的容器批量调度引擎"

# Summary. An optional shortened abstract.
summary = "Kubernetes在设计初始阶段即被定位为一个聚焦于Job服务的通用编排框架。随着它的发展，越来越多用户希望在它之上运行高性能工作负载，如Spark、Tensorflow等。运行这些负载需要一些高级特性，如公平调度, 队列和Job管理, 数据管理等。本次演讲将介绍社区在批处理能力方面的工作成果。"

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
  caption = "马达/王泽锋 于 2019年欧洲KubeCon峰会介绍Volcano"

  # Focal point (optional)
  # Options: Smart, Center, TopLeft, Top, TopRight, Left, Right, BottomLeft, Bottom, BottomRight
  focal_point = "Right"
+++
## 基于Kubernetes的批处理系统介绍

Kubernetes在设计初始阶段即被定位为一个聚焦于Job服务的通用编排框架。随着它的发展，越来越多用户希望在它之上运行高性能工作负载，如Spark、Tensorflow等。运行这些负载需要一些高级特性，如公平调度, 队列和Job管理, 数据管理等。本次演讲将介绍社区在批处理能力方面的工作成果。

## 演讲者

### 马达 (Kubernetes项目Maintainer, SIG-Scheduling Co-Leader, Volcano项目leader, 现就职于华为)

Kubernetes项目Maintainer，SIG-Scheduling Co-Leader，Volcano项目leader，吉林大学硕士，研究方向为网格计算和分布式系统。毕业后，主要研究方向为资源管理和分布式系统下的资源调度。

### 王泽锋 (华为云云原生首席架构师)

王泽锋是华为云PaaS产品部首席架构师。当前主要工作聚焦于Kubernetes、KubeEdge和华为云容器产品。他是华为云Kubernetes和云原生开源团队的负责人，也是KubeEdge项目的联合创始人。