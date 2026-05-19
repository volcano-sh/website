import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Tutorial - Basics',
      items: [
        'tutorial-basics/create-a-document',
        'tutorial-basics/create-a-page',
        'tutorial-basics/create-a-blog-post',
        'tutorial-basics/markdown-features',
        'tutorial-basics/deploy-your-site',
        'tutorial-basics/congratulations',
      ],
    },
    {
      type: 'category',
      label: 'Tutorial - Extras',
      items: [
        'tutorial-extras/manage-docs-versions',
        'tutorial-extras/translate-your-site',
      ],
    },
    {
      type: 'category',
      label: 'Scheduler',
      link: {
        type: 'doc',
        id: 'scheduler/intro',
      },
      items: [
        {
          type: 'category',
          label: 'Plugins',
          items: [
            'scheduler/plugins/gang',
            'scheduler/plugins/binpack',
            'scheduler/plugins/priority',
            'scheduler/plugins/drf',
            'scheduler/plugins/proportion',
            'scheduler/plugins/task-topology',
            'scheduler/plugins/predicates',
            'scheduler/plugins/nodeorder',
            'scheduler/plugins/sla',
            'scheduler/plugins/tdm',
            'scheduler/plugins/numa-aware',
          ],
        },
        {
          type: 'category',
          label: 'Actions',
          items: [
            'scheduler/actions/enqueue',
            'scheduler/actions/allocate',
            'scheduler/actions/backfill',
            'scheduler/actions/preempt',
            'scheduler/actions/reclaim',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
