// v1 compat shim: the v1 package entry point lived at lib/index.tsx, so any
// deep import of '@yourgpt/chatbot-reactnative/lib/index' keeps resolving.
// The real implementation now lives in src/sdk/.
export * from '../src/sdk';
export {default} from '../src/sdk';
