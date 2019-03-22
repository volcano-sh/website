+++
# Display name
name = "Volcano"

# Is this the primary user of the site?
superuser = true

# Role/position
role = "A Kuberenetes native system for High Performance Workload"

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
  icon = "envelope"
  icon_pack = "fas"
  link = "#contact"  # For a direct email link, use "mailto:test@example.org".

[[social]]
  icon = "twitter"
  icon_pack = "fab"
  #link = "https://twitter.com/GeorgeCushen"

#[[social]]
 # icon = "google-scholar"
 # icon_pack = "ai"
 # link = "https://scholar.google.co.uk/citations?user=sIwtMXoAAAAJ"

[[social]]
  icon = "github"
  icon_pack = "fab"
  #link = "https://github.com/volano-sh/volcano-sh"

# Link to a PDF of your resume/CV from the About widget.
# To enable, copy your resume/CV to `static/files/cv.pdf` and uncomment the lines below.
# [[social]]
#   icon = "cv"
#   icon_pack = "ai"
#   link = "files/cv.pdf"

+++
Volcano is a Kubernetes Native System for High Performance Workload. It is a deployment/installation framework in K8s which maps domain specific framework term's/concept into common k8s concept of Jobs and Queue. It enables the domain specific features for framework using multiple scheduling options like faire-share, gang-scheduling for Tensor Flow training.  

It provides common services to HPW like enhanced job management with multiple pod-template, job management and job life-cycle management. It also provides alternative container runtime like Singularity.   

It has special enhancements for heterogeneous computing and high performance workloads and is specifically designed to support the deployment of BigData/AI/ML Jobs
