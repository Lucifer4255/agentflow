import type { Edge } from '@xyflow/react'
import type { AgentNode } from '@/store/graphStore'

// '__env__' is a sentinel — runAgent.ts swaps it server-side with
// process.env.EXA_API_KEY so the real key never reaches the client.
const EXA_KEY = '__env__'

export const marketResearchNodes: AgentNode[] = [
  {
    id: 'input-node',
    type: 'inputNode',
    position: { x: 50, y: 300 },
    data: {
      label: 'Input',
      isInputNode: true,
      userInput: 'Research NVIDIA (NVDA)',
      systemPrompt:
        'You are a query parser. Extract the company name, stock ticker, and research intent from the user input.',
      tools: [],
      outputSchema: [
        { key: 'company', type: 'string', description: 'Full company name' },
        { key: 'ticker', type: 'string', description: 'Stock ticker symbol' },
        { key: 'researchGoal', type: 'string', description: 'What research is being requested' },
      ],
      status: 'idle',
    },
  },
  {
    id: 'news-agent',
    type: 'agentNode',
    position: { x: 350, y: 100 },
    data: {
      label: 'News Agent',
      systemPrompt:
        'You are a financial news researcher. Use the Exa search tool to find the latest news, developments, and announcements about the company.',
      tools: [
        {
          type: 'web_search',
          webSearchProvider: 'exa',
          webSearchApiKey: EXA_KEY,
        },
      ],
      inputSchema: [
        { key: 'company', type: 'string', description: 'Company to research' },
        { key: 'ticker', type: 'string', description: 'Stock ticker' },
      ],
      outputSchema: [
        { key: 'headlines', type: 'string[]', description: 'Top 5 recent news headlines' },
        { key: 'recentEvents', type: 'string', description: 'Summary of key recent events and announcements' },
        { key: 'newsSentiment', type: 'string', description: 'Overall tone of news coverage: positive, negative, or mixed' },
      ],
      status: 'idle',
    },
  },
  {
    id: 'financials-agent',
    type: 'agentNode',
    position: { x: 350, y: 500 },
    data: {
      label: 'Financials Agent',
      systemPrompt:
        'You are a financial data analyst. Use the HTTP request tool to fetch public financial data for the company from Yahoo Finance (https://query1.finance.yahoo.com/v8/finance/chart/TICKER). Analyse recent price trend, market cap, and financial highlights.',
      tools: [{ type: 'http_request' }],
      inputSchema: [
        { key: 'company', type: 'string', description: 'Company name' },
        { key: 'ticker', type: 'string', description: 'Stock ticker to fetch data for' },
      ],
      outputSchema: [
        { key: 'currentPrice', type: 'string', description: 'Current or most recent stock price with currency' },
        { key: 'priceChange', type: 'string', description: 'Price change over the past week or month' },
        { key: 'marketCap', type: 'string', description: 'Market capitalisation if available' },
        { key: 'financialHighlights', type: 'string', description: 'Key financial metrics and trends' },
      ],
      status: 'idle',
    },
  },
  {
    id: 'sentiment-agent',
    type: 'agentNode',
    position: { x: 700, y: 300 },
    data: {
      label: 'Sentiment Agent',
      systemPrompt:
        'You are a market sentiment analyst. Based on news coverage and financial data from previous agents, determine the overall market sentiment with clear reasoning.',
      tools: [],
      inputSchema: [
        { key: 'headlines', type: 'string[]', description: 'Recent news headlines' },
        { key: 'recentEvents', type: 'string', description: 'Key recent events' },
        { key: 'newsSentiment', type: 'string', description: 'News tone' },
        { key: 'currentPrice', type: 'string', description: 'Current stock price' },
        { key: 'priceChange', type: 'string', description: 'Recent price movement' },
      ],
      outputSchema: [
        { key: 'verdict', type: 'string', description: 'Bullish, Neutral, or Bearish' },
        { key: 'confidence', type: 'string', description: 'Low, Medium, or High confidence in the verdict' },
        { key: 'reasoning', type: 'string', description: 'Explanation for the sentiment verdict' },
        { key: 'keySignals', type: 'string[]', description: 'Top 3 signals driving the sentiment' },
      ],
      status: 'idle',
    },
  },
  {
    id: 'risk-agent',
    type: 'agentNode',
    position: { x: 1000, y: 300 },
    data: {
      label: 'Risk Agent',
      systemPrompt:
        'You are a risk analyst. Use the code executor to calculate a risk score (0–100) in Python based on sentiment verdict, confidence, and price movement. Print the score and a short breakdown of contributing factors.',
      tools: [{ type: 'code_executor', language: 'python' }],
      inputSchema: [
        { key: 'verdict', type: 'string', description: 'Sentiment verdict' },
        { key: 'confidence', type: 'string', description: 'Confidence level' },
        { key: 'priceChange', type: 'string', description: 'Recent price movement' },
        { key: 'keySignals', type: 'string[]', description: 'Key sentiment signals' },
      ],
      outputSchema: [
        { key: 'riskScore', type: 'number', description: 'Risk score from 0 (low risk) to 100 (high risk)' },
        { key: 'riskLevel', type: 'string', description: 'Low, Medium, or High' },
        { key: 'riskFactors', type: 'string[]', description: 'Top risk factors identified' },
        { key: 'mitigatingFactors', type: 'string[]', description: 'Factors that reduce risk' },
      ],
      status: 'idle',
    },
  },
  {
    id: 'synthesis-agent',
    type: 'agentNode',
    position: { x: 1300, y: 300 },
    data: {
      label: 'Research Brief',
      systemPrompt:
        'You are a senior investment analyst. Synthesise all research into a structured investment brief. End with a disclaimer that this is for research purposes only, not financial advice.',
      tools: [],
      inputSchema: [
        { key: 'recentEvents', type: 'string', description: 'Key news and events' },
        { key: 'financialHighlights', type: 'string', description: 'Financial metrics' },
        { key: 'verdict', type: 'string', description: 'Sentiment verdict' },
        { key: 'riskScore', type: 'number', description: 'Calculated risk score' },
        { key: 'riskLevel', type: 'string', description: 'Risk level classification' },
        { key: 'riskFactors', type: 'string[]', description: 'Key risk factors' },
      ],
      outputSchema: [
        { key: 'executiveSummary', type: 'string', description: 'One paragraph executive summary' },
        { key: 'keyFindings', type: 'string[]', description: 'Top 5 findings from the research' },
        { key: 'sentimentAndRisk', type: 'string', description: 'Combined sentiment and risk assessment' },
        { key: 'outlook', type: 'string', description: 'Short-term outlook and considerations' },
        { key: 'disclaimer', type: 'string', description: 'Research disclaimer' },
      ],
      status: 'idle',
    },
  },
]

export const marketResearchEdges: Edge[] = [
  { id: 'e1', source: 'input-node', target: 'news-agent' },
  { id: 'e2', source: 'input-node', target: 'financials-agent' },
  { id: 'e3', source: 'news-agent', target: 'sentiment-agent' },
  { id: 'e4', source: 'financials-agent', target: 'sentiment-agent' },
  { id: 'e5', source: 'sentiment-agent', target: 'risk-agent' },
  { id: 'e6', source: 'risk-agent', target: 'synthesis-agent' },
]
