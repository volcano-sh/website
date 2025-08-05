import React from "react";
import { usePluginData } from "@docusaurus/useGlobalData";
import SectionContainer from "../SectionContainer";
import { useHistory } from "@docusaurus/router";
import Translate from "@docusaurus/Translate";
import PropTypes from "prop-types";
import Link from "@docusaurus/Link";
import "./styles.css";

// Date formatting utility function
const formatBlogDate = (dateString) => {
  const date = new Date(dateString);
  return {
    day: date.getDate(),
    monthYear: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    fullDate: date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    })
  };
};

// Blog post card component
const BlogPostCard = ({ post, onClick }) => {
  const { title, date, permalink, authors, frontMatter } = post.metadata;
  const { fullDate } = formatBlogDate(date);

  return (
    <Link to={permalink} className="blog-card-link">
      <div className="blog-card">
        <div className="blog-content">
          <h3 className="blog-title">{title}</h3>
          <p className="blog-description">{frontMatter?.summary || frontMatter?.description || ""}</p>
          <div className="blog-author">
            {authors.length > 0 && authors[0].name}
          </div>
          <div className="blog-update-time">
            <Translate>Last updated on</Translate> {fullDate}
          </div>
        </div>
      </div>
    </Link>
  );
};

BlogPostCard.propTypes = {
  post: PropTypes.shape({
    metadata: PropTypes.shape({
      title: PropTypes.string,
      date: PropTypes.string,
      permalink: PropTypes.string,
      authors: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          url: PropTypes.string
        })
      ),
      frontMatter: PropTypes.shape({
        summary: PropTypes.string,
        description: PropTypes.string
      })
    })
  }).isRequired,
  onClick: PropTypes.func.isRequired
};

export default function Blogs() {
  // Get blog data from plugin
  const pluginData = usePluginData("blog-global-dataPlugin");
  const blogPosts = pluginData?.blogPosts || [];

  // Get recent posts (top 3)
  const recentPosts = React.useMemo(() => blogPosts.slice(0, 3), [blogPosts]);
  const history = useHistory();

  // Sample blog data for demonstration with Volcano-related content
  const sampleBlogs = [
    {
      metadata: {
        title: "Volcano v1.11.0 Available Now",
        permalink: "/blog/Volcano-1.11.0-release/Volcano-1.11.0-release",
        date: "2025-02-07",
        authors: [{ name: "Volcano Team", url: "#" }],
        frontMatter: {
          summary: "Volcano v1.11.0 introduces enhanced GPU scheduling capabilities, improved job management, and better integration with AI/ML frameworks."
        }
      }
    },
    {
      metadata: {
        title: "How Volcano Boosts Distributed Training and Inference Performance",
        permalink: "/blog/how-volcano-boosts-distributed-training-and-inference-performance/how-volcano-boosts-distributed-training-and-inference-performance",
        date: "2025-01-15",
        authors: [{ name: "Cloud Native Computing Foundation", url: "#" }],
        frontMatter: {
          summary: "Learn how Volcano optimizes resource allocation and scheduling for distributed AI/ML workloads, significantly improving training and inference performance."
        }
      }
    },
    {
      metadata: {
        title: "Volcano v1.10.0 Available Now",
        permalink: "/blog/Volcano-1.10.0-release/Volcano-1.10.0-release",
        date: "2024-09-29",
        authors: [{ name: "Volcano Contributors", url: "#" }],
        frontMatter: {
          summary: "Volcano v1.10.0 has been released with new features including enhanced queue management, improved job scheduling, and better integration with Kubernetes."
        }
      }
    }
  ];

  // Use actual blog posts if available, otherwise use sample data
  const displayPosts = recentPosts.length > 0 ? recentPosts : sampleBlogs;

  return (
    <SectionContainer className="blogs-section">
      <div className="blogs-header">
        <h2 className="blogs-title">Recent Blogs</h2>
        <Link to="/blog" className="view-all-link">View All</Link>
      </div>
      
      <div className="blogs-container">
        {displayPosts.map((post, index) => (
          <BlogPostCard 
            key={index} 
            post={post} 
          />
        ))}
      </div>
    </SectionContainer>
  );
}