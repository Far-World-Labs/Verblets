# setInterval

AI-guided replacement for `setInterval`.
Feed it your own natural-language heuristic; it will keep time, remember history, and supply your callback with rich context so you can build self-tuning workflows, creative generators, or living UIs.

```javascript
setInterval({
  intervalPrompt: String,   // mandatory
  fn:            Function,  // mandatory
  historySize?:  Number,
  firstInterval?:String,
  model?:        String,
}); // returns a cancel function
```

## Example: adaptive break scheduler

```javascript
import setInterval from './index.js';
import {
  getSlackActivity,
  getJiraStatus,
  fetchWeather,
  sendBreakReminder,
  userSchedule,
  onLogout,
} from './work-utils.js';

const stop = setInterval({
  intervalPrompt: `
    Using lastInvocationResult.slack, lastInvocationResult.jira,
    lastInvocationResult.weather, and lastInvocationResult.schedule,
    choose the next reminder time. Shorten the interval when Slack or Jira
    stays busy for twenty minutes. Skip reminders during the lunch block and
    suggest a short walk whenever the weather is sunny and the schedule
    allows it.
  `,
  async fn() {
    const [slack, jira, weather] = await Promise.all([
      getSlackActivity(),
      getJiraStatus(),
      fetchWeather(),
    ]);
    await sendBreakReminder();
    return { slack, jira, weather, schedule: userSchedule };
  },
});

onLogout(stop);
```

Return data from `fn` becomes `lastInvocationResult` in the next prompt,
so each cycle can reason with up-to-date context.

## Use case: passive stress detection

By quietly monitoring work activity and cross-checking personal scheduling
preferences, this timer encourages healthy pauses without constant polling for
biometric data. It adapts to busy periods in Slack or Jira, respects your lunch
hour, and even suggests a short walk whenever the weather cooperates.

