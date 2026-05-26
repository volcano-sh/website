import React from "react";
import Layout from "@theme/Layout";
import Hero from "../components/Hero";
import WhyVolcano from "../components/why_volcano";
import Frameworks from "../components/Frameworks";
import Blog from "../components/Blog";
import Supporters from "../components/Supporters";

export default function Home() {
  return (
    <Layout
      title=""
      description="Cloud native batch scheduling system for compute-intensive workloads"
    >
      <Hero />
      <WhyVolcano />
      <Frameworks />
      <Blog />
      <Supporters />
    </Layout>
  );
}