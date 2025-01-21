+++
# Display name
name = "Volcano"

# Is this the primary user of the site?
superuser = true

# Role/position
role = "一个用于高性能工作负载场景下基于Kubernetes的容器批量调度引擎"

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

# Link to a PDF of your resume/CV from the About widget.
# To enable, copy your resume/CV to `static/files/cv.pdf` and uncomment the lines below.
# [[social]]
#   icon = "cv"
#   icon_pack = "ai"
#   link = "files/cv.pdf"

+++
Volcano是CNCF首个云原生批量计算项目，专注于AI、大数据、基因分析等高性能计算场景。核心能力涉及：

•  统一调度：支持 Kubernetes 原生负载及主流计算框架（如 TensorFlow、Spark、PyTorch、Ray、Flink等）的一体化作业调度。

•  队列管理：提供多层级队列管理能力，实现精细化资源配额控制和任务优先级调度。

•  异构设备支持：高效调度GPU、NPU等异构设备，充分释放硬件算力潜力。

•  网络拓扑感知：支持网络拓扑感知调度，显著降低跨节点间的应用通信开销，在AI分布式训练场景中大幅提升模型训练效率

•  多集群调度：支持跨集群作业调度，提升资源池管理能力，实现大规模负载均衡。

•  在离线混部：实现在线与离线任务混合部署，提升集群资源利用率。

•  负载感知重调度：支持负载感知重调度，优化集群负载分布，提升系统稳定性

作为业界首个云原生批量计算引擎，Volcano已广泛应用于人工智能、大数据、基因测序等高性能计算场景，为企业构建弹性、高效、智能的计算平台提供了强大支持。
