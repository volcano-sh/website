+++
# Custom widget.
# An example of using the custom widget to create your own homepage section.
# To create more sections, duplicate this file and edit the values below as desired.
widget = "featured"
active = true
date = 2016-04-20T00:00:00

title = "Why Volcano??"
subtitle = "Are you planning to Deploy any of the below workloads on Kubernetes? &#13;&#10; If Yes then Volcano is the right choice for your Deployment framework. "

# Order that this section will appear in.
weight = 7

# Showcase personal skills or business features.
# 
# Add/remove as many `[[feature]]` blocks below as you like.
# 
# Available icon packs and icons:
# * fas - Font Awesome standard icons (see https://fontawesome.com/icons)
# * fab - Font Awesome brand icons (see https://fontawesome.com/icons)
# * ai - academic icons (see https://jpswalsh.github.io/academicons/)

[[featured]]
  img_src = "kubeflow.png"
  img_width = "100px"
  img_height = "60px"
  name = "kubeflow" 
  description = "The Kubeflow project is dedicated to making deployments of machine learning (ML) workflows on Kubernetes simple, portable and scalable. Our goal is not to recreate other services, but to provide a straightforward way to deploy best-of-breed open-source systems for ML to diverse infrastructures."
  
[[featured]]
  img_src = "spark-logo-hd.png"
  img_width = "100px"
  img_height = "60px"
  name = "spark"
  description = "Spark is a fast and general cluster computing system for Big Data. It provides high-level APIs in Scala, Java, Python, and R, and an optimized engine that supports general computation graphs for data analysis.It also supports a rich set of higher-level tools including Spark SQL, MLlib, GraphX and Spark Streaming."  
  
[[featured]]
  img_src = "kubegene_logo.png"
  img_width = "100px"
  img_height = "60px"
  name = "kubegene"
  description = "KubeGene is dedicated to making genome sequencing process simple, portable and scalable. It provides a complete solution for genome sequencing on the kubernetes and supports mainstream biological genome sequencing scenarios such as DNA, RNA, and liquid biopsy."

+++
