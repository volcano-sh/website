import React from "react";
import AskAI from "@site/src/components/AskAI";

export default function Root({ children }) {
  return (
    <>
      {children}
      <AskAI />
    </>
  );
}
