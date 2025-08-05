import React from "react";
import Layout from "@theme/Layout";
import Hero from "../components/Hero";
import Why from "../components/Why";
import Frameworks from "../components/Frameworks";
import Supporters from "../components/Supporters";
// import About from "../components/About";
import Blogs from "../components/Blogs";

export default function Home() {
  return (
    <Layout
      title=""
      description="Cloud native batch scheduling system for compute-intensive workloads"
    >
      <Hero />
      <Why />
      <Frameworks />
      <Blogs />
      <Supporters />
    </Layout>
  );
}
