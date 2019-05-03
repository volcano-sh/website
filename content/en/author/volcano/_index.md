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
  link = "https://twitter.com/volcano_sh"

#[[social]]
 # icon = "google-scholar"
 # icon_pack = "ai"
 # link = "https://scholar.google.co.uk/citations?user=sIwtMXoAAAAJ"

[[social]]
  icon = "github"
  icon_pack = "fab"
  link = "https://github.com/volcano-sh/volcano"

# Link to a PDF of your resume/CV from the About widget.
# To enable, copy your resume/CV to `static/files/cv.pdf` and uncomment the lines below.
# [[social]]
#   icon = "cv"
#   icon_pack = "ai"
#   link = "files/cv.pdf"

+++
Volcano is system for runnning high performance workloads on
Kubernetes.  It provides a suite of mechanisms currently missing from
Kubernetes that are commonly required by many classes of high
performance workload including:

-  Machine Learning/Deep Learning,
-  Bioinformatics/Genomics, and 
-  Other "big data" applications.

These types of applications typically run on generalized domain
frameworks like Tensorflow, Spark, PyTorch, MPI, etc, which Volcano integrates with.

Volcano builds upon a decade and a half of experience running a wide
variety of high performance workloads at scale using several systems
and platforms, combined with best-of-breed ideas and practices from
the open source community.
