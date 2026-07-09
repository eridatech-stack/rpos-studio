import { generateArticleDraft } from "@/services/articleDraftService";
import { publishArticleToWordPressDraft } from "@/services/wordpressService";

export type WorkflowStepContext = {
  productionRunId: string;
  articleId: string;
};

export type WorkflowStepExecutor = {
  code: string;
  name: string;
  execute(context: WorkflowStepContext): Promise<void>;
};

export const workflowStepRegistry: Record<string, WorkflowStepExecutor> = {
  outline: {
    code: "outline",
    name: "Generate Outline",
    async execute() {
      // Currently skipped because production starts from an existing article.
      // Later this will support keyword → outline generation.
      return;
    },
  },

  draft: {
    code: "draft",
    name: "Generate Draft",
    async execute(context) {
      await generateArticleDraft(context.articleId);
    },
  },

  wordpress_draft: {
    code: "wordpress_draft",
    name: "Create WordPress Draft",
    async execute(context) {
      await publishArticleToWordPressDraft(context.articleId);
    },
  },
};