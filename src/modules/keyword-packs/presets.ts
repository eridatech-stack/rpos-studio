export type KeywordPackPreset = {
  id: string;
  label: string;
  name: string;
  niche: string;
  targetLanguage: string;
  targetCountries: string;
  audience: string;
  businessGoal: string;
  monetizationModel: string;
  excludedTopics: string;
  preferredCategories: string;
  brandNotes: string;
  recommendedGenerationMode: string;
};

export const keywordPackPresets: KeywordPackPreset[] = [
  {
    id: "travel",
    label: "Travel",
    name: "Travel content opportunity map",
    niche: "Travel planning",
    targetLanguage: "English",
    targetCountries: "United States, Canada, United Kingdom, Australia",
    audience:
      "Solo travelers, private group travelers, family vacation planners, budget-conscious vacation researchers",
    businessGoal:
      "Grow organic traffic with destination guides, planning advice, comparison content, and seasonal travel opportunities.",
    monetizationModel:
      "Affiliate travel bookings, hotels and stays, travel insurance, tours, display ads, sponsored recommendations",
    excludedTopics:
      "adult travel, gambling, illegal activities, visa/legal advice presented as guaranteed, unsafe travel claims",
    preferredCategories:
      "Destinations, Travel Planning, Budget Travel, Family Travel, Solo Travel, Travel Gear, Travel Apps, Hotels and Stays, Tours and Experiences, Seasonal Travel",
    brandNotes:
      "Friendly, practical, trustworthy, and easy to scan. Include helpful caveats for pricing, availability, and seasonality.",
    recommendedGenerationMode: "balanced",
  },
  {
    id: "ai-tools",
    label: "AI Tools",
    name: "AI tools comparison keyword pack",
    niche: "AI productivity tools",
    targetLanguage: "English",
    targetCountries: "United States, Canada, United Kingdom, Australia",
    audience:
      "Small business owners, marketers, creators, team leads, students, and productivity-focused professionals",
    businessGoal:
      "Build topical authority around practical AI tool use, comparisons, tutorials, and buyer-intent searches.",
    monetizationModel:
      "Software affiliate programs, sponsored tool placements, newsletter growth, display ads, digital templates",
    excludedTopics:
      "deepfake abuse, malware, academic dishonesty, medical/legal/financial decisions without expert review, adult content",
    preferredCategories:
      "AI Writing Tools, AI Productivity, AI Image Tools, AI Automation, Prompting, Business Use Cases, Tool Comparisons, AI Safety, Free AI Tools, AI Workflows",
    brandNotes:
      "Practical and evidence-aware. Avoid hype, unsupported claims, and pretending tools were hands-on tested unless verified.",
    recommendedGenerationMode: "commercial",
  },
  {
    id: "productivity",
    label: "Productivity",
    name: "Productivity app opportunity map",
    niche: "Task management and productivity software",
    targetLanguage: "English",
    targetCountries: "United States, Canada, United Kingdom, Australia",
    audience:
      "Busy professionals, team leads, freelancers, students, operations managers, and small business owners",
    businessGoal:
      "Capture software comparison and how-to searches while building a library of practical productivity workflows.",
    monetizationModel:
      "Software affiliate programs, SaaS referrals, downloadable templates, newsletter growth, display ads",
    excludedTopics:
      "employee surveillance, productivity guilt, medical mental health claims, illegal workplace tracking",
    preferredCategories:
      "Task Management, Project Management, Time Management, Team Collaboration, Automation, Productivity Apps, Remote Work, Templates, Meeting Management, Workflow Design",
    brandNotes:
      "Clear, calm, and workflow-focused. Include fit guidance for different team sizes and avoid one-size-fits-all recommendations.",
    recommendedGenerationMode: "balanced",
  },
  {
    id: "personal-finance",
    label: "Personal Finance",
    name: "Personal finance keyword architecture",
    niche: "Personal finance education",
    targetLanguage: "English",
    targetCountries: "United States",
    audience:
      "Beginners, families, young professionals, budget-conscious households, and people comparing financial apps",
    businessGoal:
      "Create helpful financial education content while targeting app comparisons, budgeting guides, and practical money-management searches.",
    monetizationModel:
      "Financial app affiliates, display ads, newsletter growth, budgeting templates, sponsored financial education content",
    excludedTopics:
      "guaranteed returns, personalized investment advice, tax/legal advice, debt settlement promises, crypto speculation",
    preferredCategories:
      "Budgeting, Saving Money, Credit, Banking, Investing Basics, Taxes, Insurance, Financial Apps, Family Finance, Debt Management, Retirement Basics",
    brandNotes:
      "Careful, plain-English, and non-alarmist. Use disclaimers where appropriate and avoid promises of financial outcomes.",
    recommendedGenerationMode: "informational",
  },
  {
    id: "home-improvement",
    label: "Home Improvement",
    name: "Home improvement SEO content plan",
    niche: "Home improvement and DIY planning",
    targetLanguage: "English",
    targetCountries: "United States, Canada, United Kingdom, Australia",
    audience:
      "Homeowners, renters, beginner DIYers, renovation planners, and people deciding whether to hire a professional",
    businessGoal:
      "Build topical authority with safe DIY guides, buying guides, maintenance checklists, and contractor decision content.",
    monetizationModel:
      "Product affiliate links, service leads, local recommendations, display ads, sponsored placements",
    excludedTopics:
      "unsafe electrical work, structural engineering claims, hazardous materials, code/legal guarantees, medical mold claims",
    preferredCategories:
      "DIY Projects, Home Maintenance, Tools and Materials, Renovation Planning, Safety, Smart Home, Outdoor Spaces, Hiring Contractors, Cleaning, Energy Efficiency",
    brandNotes:
      "Safety-first and practical. Clearly separate beginner DIY from work that should be handled by licensed professionals.",
    recommendedGenerationMode: "balanced",
  },
  {
    id: "health-wellness",
    label: "Health & Wellness",
    name: "Wellness content opportunity map",
    niche: "General wellness and healthy habits",
    targetLanguage: "English",
    targetCountries: "United States, Canada, United Kingdom, Australia",
    audience:
      "Beginners building healthier routines, busy adults, families, and people comparing wellness products or apps",
    businessGoal:
      "Create low-risk wellness education around habits, routines, product comparisons, and general lifestyle content.",
    monetizationModel:
      "Affiliate wellness products, app referrals, display ads, newsletter growth, sponsored wellness content",
    excludedTopics:
      "diagnosis, treatment claims, medical advice, supplement cure claims, eating disorder content, emergency health advice",
    preferredCategories:
      "Healthy Habits, Sleep, Fitness Basics, Nutrition Basics, Stress Management, Wellness Apps, Home Fitness, Product Comparisons, Family Wellness, Preventive Lifestyle",
    brandNotes:
      "Evidence-aware and cautious. Keep content general, encourage professional medical guidance, and avoid disease-treatment claims.",
    recommendedGenerationMode: "informational",
  },
  {
    id: "food-cooking",
    label: "Food & Cooking",
    name: "Food and cooking keyword plan",
    niche: "Home cooking and meal planning",
    targetLanguage: "English",
    targetCountries: "United States, Canada, United Kingdom, Australia",
    audience:
      "Home cooks, busy families, beginners, meal planners, budget-conscious shoppers, and kitchen gear researchers",
    businessGoal:
      "Grow traffic with recipes-adjacent guides, meal planning content, kitchen gear comparisons, and practical cooking advice.",
    monetizationModel:
      "Kitchen product affiliates, grocery partnerships, display ads, meal plan downloads, sponsored recipe content",
    excludedTopics:
      "medical diet claims, unsafe food preservation, extreme diets, weight-loss guarantees, alcohol-heavy content",
    preferredCategories:
      "Meal Planning, Budget Meals, Cooking Basics, Kitchen Gear, Family Meals, Healthy Recipes, Food Storage, Special Diet Basics, Grocery Shopping, Entertaining",
    brandNotes:
      "Warm and practical. Prioritize safe food handling, realistic prep times, substitutions, and beginner-friendly steps.",
    recommendedGenerationMode: "balanced",
  },
  {
    id: "small-business",
    label: "Small Business",
    name: "Small business software and operations pack",
    niche: "Small business operations and software",
    targetLanguage: "English",
    targetCountries: "United States, Canada, United Kingdom, Australia",
    audience:
      "Small business owners, solo founders, operations managers, service businesses, and early-stage teams",
    businessGoal:
      "Capture commercial software searches and practical operations questions for small business owners.",
    monetizationModel:
      "Software affiliate programs, lead generation, templates, newsletter growth, display ads, sponsored tool content",
    excludedTopics:
      "legal advice, tax advice, payroll guarantees, financing promises, unsupported income claims, regulated industry compliance",
    preferredCategories:
      "Business Software, Operations, Marketing, Sales, Customer Service, Finance Tools, HR Basics, Automation, Templates, Comparisons",
    brandNotes:
      "Useful and direct. Include tradeoffs by company size, budget, and workflow maturity.",
    recommendedGenerationMode: "commercial",
  },
];

export function listKeywordPackPresets() {
  return keywordPackPresets.map(({ id, label }) => ({
    id,
    label,
  }));
}

export function getKeywordPackPreset(id: string) {
  return keywordPackPresets.find((preset) => preset.id === id) || null;
}
