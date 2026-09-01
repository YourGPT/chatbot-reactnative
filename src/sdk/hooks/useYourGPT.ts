import {useYourGPTContext} from '../components/YourGPTProvider';
import type {YourGPTContextValue} from '../components/YourGPTProvider';

export function useYourGPT(): YourGPTContextValue {
  return useYourGPTContext();
}
