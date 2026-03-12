import React from "react";
import { usePluginData } from "@docusaurus/useGlobalData";
import Link from "@docusaurus/Link";
import Translate from "@docusaurus/Translate";
import Container from "../Containers";
import "./styles.css";

export default function Blog() {

  const pluginData = usePluginData("blog-list-data", "default", {
    failfast: false,
  });
  const blogPosts = pluginData?.blogList || [];

  const recentPosts = blogPosts.slice(0, 5);

  const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return { day, month, year };
  };

  return (
    <Container className="blogContainer">
      <h1>
        <Translate>Recent Posts</Translate>
      </h1>
      {recentPosts.length > 0 ? (
        <div className="blogPostsContainer">
          {recentPosts.map((post, idx) => {
            const { day, month, year } = formatDate(post.date);
            const author =
              Array.isArray(post.authors) && post.authors.length > 0
                ? post.authors[0]
                : "Volcano";

            return (
              <div key={post.id || idx} className="blogPostCard">
                <div className="blogPostDate">
                  <div className="blogPostDay">{day}</div>
                  <div className="blogPostMonthYear">
                    <div className="blogPostMonth">{month}</div>
                    <div className="blogPostYear">{year}</div>
                  </div>
                </div>
                <div className="blogPostContent">
                  <h3 className="blogPostTitle">
                    <Link to={post.permalink}>{post.title}</Link>
                  </h3>
                  <div className="blogPostAuthor">
                    <img
                      src="/img/icon_user.svg"
                      alt="user"
                      className="blogUserIcon"
                    />
                    <span>{author}</span>
                  </div>
                  {post.description && (
                    <div className="blogPostDescription">
                      {post.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="blogEmptyMessage">
          <Translate>Read the latest news and updates from the Volcano project.</Translate>
        </p>
      )}
      <div className="blogViewAll">
        <Link to="/blog" className="blogViewAllLink">
          <Translate>View all</Translate> →
        </Link>
      </div>
    </Container>
  );
}
