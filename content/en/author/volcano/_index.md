+++
# Display name
name = "Volcano"

# Is this the primary user of the site?
superuser = true

# Role/position
role = "A cloud native system for high-performance workloads"

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

+++
Volcano is system for running high-performance workloads on Kubernetes. It features powerful batch scheduling capability that Kubernetes cannot provide but is commonly required by many classes of high-performance workloads, including:

- Machine learning/Deep learning
- Bioinformatics/Genomics
- Other big data applications

These types of applications typically run on generalized domain frameworks like TensorFlow, Spark, PyTorch, and MPI. Volcano is integrated with these frameworks to allow you to run your applications without adaptation efforts while enjoying remarkable batch scheduling.
