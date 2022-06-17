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
Volcano是在Kubernetes上运行高性能工作负载的容器批量计算引擎。
它提供了Kubernetes目前缺少的一套机制，这些机制通常是许多高性能
工作负载所必需的，包括：

\-  机器学习/深度学习   
\-  生物学计算/基因计算   
\-  大数据应用    


这些类型的应用程序通常运行在像Tensorflow、Spark、PyTorch、
MPI等通用领域框架上，Volcano无缝对接这些框架。

***

Volcano基于15年来使用多种系统和平台大规模运行各种高性能工作负载
的经验，并结合来自开源社区的最佳思想和实践。
