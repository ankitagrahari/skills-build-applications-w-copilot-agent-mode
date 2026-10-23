import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = { title: string; reason: string };

const loadSuggestions = async () => (await getJson<{ suggestions: WorkoutSuggestion[] }>(
  `/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`,
)).suggestions;

export default function Workouts() {
  return <CapabilityCard
    title="Workout suggestions"
    description="Recommend workouts from activity patterns."
    emptyMessage="No workout suggestions available."
    load={loadSuggestions}
    renderItem={(suggestion) => <>{suggestion.title}: {suggestion.reason}</>}
  />;
}
