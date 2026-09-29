---
title: 'From PPO to DPO to GRPO: A Guide to Reinforcement Learning for LLMs'
date: 2026-04-15
permalink: /posts/en/2026/04/ppo-dpo-grpo/
lang: en
translation_key: ppo-dpo-grpo
view_key: posts-2026-04-ppo-dpo-grpo
reading_time: "90 minutes read"
tags:
  - Post-training
  - RL
---

> **TL;DR:** Reinforcement learning runs through the post-training stage of RLHF for large language models. [PPO](https://arxiv.org/abs/1707.06347) from OpenAI, [DPO](https://arxiv.org/abs/2305.18290) from Stanford, and [GRPO](https://arxiv.org/abs/2402.03300) from DeepSeek have each changed how LLMs are trained after pre-training. This article covers their objectives, derivations, and implementations, then connects the design choices that led from one method to the next.

***

# 1 PPO: the foundation of RLHF

## 1.1 Background and motivation

[Proximal Policy Optimization (PPO)](https://arxiv.org/abs/1707.06347) was introduced by Schulman et al. in 2017. Its original goal was to simplify TRPO (Trust Region Policy Optimization): replace a second-order KL constraint with clipping, keep policy updates reasonably stable, and reuse the same batch for several optimization steps. In LLM alignment, PPO is commonly used for the RL stage of RLHF. A model first goes through supervised fine-tuning and reward-model training, then RL optimizes it against human preferences.

PPO addresses a direct problem: **improve the reward while limiting how far the new policy moves from the old one in a single update**.

## 1.2 The PPO objective

The objective is the best place to start because it shows what PPO actually optimizes:

$$\mathcal{J}_{PPO}(\theta) = \mathbb{E}[q \sim P(Q), o \sim \pi_{\theta_{old}}(O|q)] \frac{1}{|o|} \sum_{t=1}^{|o|} \min \left[ \frac{\pi_\theta(o_t | q, o_{<t})}{\pi_{\theta_{old}}(o_t | q, o_{<t})} A_t, \text{clip}\left(\frac{\pi_\theta(o_t | q, o_{<t})}{\pi_{\theta_{old}}(o_t | q, o_{<t})}, 1-\varepsilon, 1+\varepsilon\right) A_t \right]$$

Term by term:

| Symbol | Meaning |
| --- | --- |
| $q \sim P(Q)$ | Sample a question or prompt from the prompt distribution. |
| $o \sim \pi_{\theta_{old}}(O \mid q)$ | Generate a complete sequence $o=(o_1,\dots,o_{\vert o\vert})$ with the old policy. |
| $\vert o\vert$ | Output length. The factor $\frac{1}{\vert o\vert}\sum_{t=1}^{\vert o\vert}$ averages over all tokens so long responses do not receive more loss weight. |
| $\pi_\theta(o_t \mid q,o_{<t})$ | The current policy's probability of token $o_t$ given the prompt and prefix. |
| $\pi_{\theta_{old}}(o_t \mid q,o_{<t})$ | The old policy's probability of the same token, used in the importance ratio $r_t(\theta)=\frac{\pi_\theta(o_t\mid q,o_{<t})}{\pi_{\theta_{old}}(o_t\mid q,o_{<t})}$. |
| $A_t$ | The advantage of token $t$, usually computed with GAE: future return along the sampled path minus the value-network baseline. |
| $\varepsilon$ | The clipping parameter, commonly between $0.1$ and $0.2$. |

The objective multiplies the change in token probability by the token's advantage, then clips the ratio to limit the size of one update.

Four components matter:

1. **Importance sampling ratio** $r_t(\theta)=\frac{\pi_\theta}{\pi_{\theta_{old}}}$ measures the difference between the new and old policies.

2. **Advantage** $A_t$ measures whether an action performed better than the baseline.
   - If $A_t>0$, increase the action's probability.
   - If $A_t<0$, decrease it.

3. **Clipping** constrains $r_t(\theta)$ to $[1-\varepsilon,1+\varepsilon]$.
   - For $A_t>0$, the ratio cannot contribute beyond $1+\varepsilon$.
   - For $A_t<0$, it cannot contribute below $1-\varepsilon$.

4. **Clipping works together with the importance ratio.** PPO and GRPO both use that ratio to scale the log-probability gradient of sampled tokens, then clip it to limit the update.

$A_t$ determines the direction and strength of each token update. The next sections follow the sampling process and derive it.

## 1.3 Sampling data and computing $A_t$

### 1.3.1 Sampling a trajectory from the old policy

First, sample a complete output from $\pi_{\theta_{old}}$:

$$o=(o_1,\cdots,o_T)\sim\pi_{\theta_{old}}(O|q)$$

A reward model scores the output, and a KL penalty gives the reward at each step:

$$r_{t}=r_{\varphi}(q,o_{\leq t})-\beta\log\frac{\pi_{\theta}(o_{t}|q,o_{<t})}{\pi_{\text{ref}}(o_{t}|q,o_{<t})}$$

The KL term keeps the policy from drifting too far from the reference model in pursuit of reward.

### 1.3.2 Computing advantage from reward and value with GAE

The reward alone does not say how much better an action was than the baseline. That is the role of $A_t$.

The baseline is the state-value function $V(s_t)$, produced by a separate critic, also called the value network:

- The **reward model** scores the complete answer and supplies $r_t$. It remains frozen during RL.
- The **critic** predicts the expected cumulative return from the current state, $V(s_t)=\mathbb{E}[G_t\mid s_t]$. It is trained alongside the actor.

For the moment, assume the critic already produces useful values. Its own training appears in Section 1.4.

The state value is the expected discounted return from the current state to the end of the sequence:

$$V(s_t) \approx r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \dots$$

Using its recursive form:

$$V(s_t) \approx \underbrace{r_t}_{\text{immediate reward}} + \underbrace{\gamma V(s_{t+1})}_{\text{future value}}$$

**Step one: temporal-difference error $\delta_t$**

$$\delta_t = r_t + \gamma V(s_{t+1}) - V(s_t)$$

where:

- $r_t$ is the immediate reward, usually a KL penalty except for the large terminal score.
- $V(s_t)$ is the critic's estimate of the current state.
- $V(s_{t+1})$ is its estimate after taking the action.
- $\gamma$ is the discount factor, often 0.99.

If $\delta_t>0$, then $r_t+\gamma V(s_{t+1})$ exceeded $V(s_t)$. The outcome was better than the critic expected.

**Step two: GAE advantage $\hat{A}_t$**

A TD error sees only one step. GAE discounts and accumulates the current and future errors:

$$\hat{A}_t = \delta_t + (\gamma \lambda)\delta_{t+1} + (\gamma \lambda)^2 \delta_{t+2} + \cdots + (\gamma \lambda)^{T-t} \delta_T$$

$\lambda$, often 0.95, trades bias against variance. The current action's advantage depends on its own TD error and on whether it led to better later steps.

In one line:

$$\text{Advantage}=\text{a discounted sum of (outcome - expectation)}$$

### 1.3.3 Computing the target return at every position

The target is:

$$\text{Target}_t = V(s_t) + \hat{A}_t$$

Its relation to the n-step return becomes clearer after expanding the definitions:

- TD error: $\delta_t=r_t+\gamma V(s_{t+1})-V(s_t)$
- GAE: $\hat{A}_t=\sum_{k=0}^{\infty}(\gamma\lambda)^k\delta_{t+k}$

Expand the first terms of $\text{Target}_t=V(s_t)+\hat{A}_t$:

$$\begin{aligned} \text{Target}_t &= \mathbf{V(s_t)} \\ &+ \underbrace{(r_t + \gamma V(s_{t+1}) - \mathbf{V(s_t)})}_{\delta_t} \\ &+ (\gamma\lambda) \underbrace{(r_{t+1} + \gamma V(s_{t+2}) - V(s_{t+1}))}_{\delta_{t+1}} \\ &+ (\gamma\lambda)^2 \delta_{t+2} + \dots \end{aligned}$$

$V(s_t)$ cancels with $-V(s_t)$:

$$\text{Target}_t = r_t + \gamma V(s_{t+1}) + (\gamma\lambda)(r_{t+1} + \gamma V(s_{t+2}) - V(s_{t+1})) + \dots$$

Collect the terms containing $V(s_{t+1})$:

$$\gamma V(s_{t+1}) - \gamma\lambda V(s_{t+1}) = \gamma(1-\lambda)V(s_{t+1})$$

The expression becomes:

$$\begin{aligned} \text{Target}_t &= r_t + \gamma (1-\lambda)V_{t+1} \\ &+ \gamma\lambda r_{t+1} + (\gamma\lambda) \gamma (1-\lambda)V_{t+2} \\ &+ (\gamma\lambda)^2 \left[ r_{t+2} + \gamma (1-\lambda)V_{t+3} + \dots \right] \end{aligned}$$

Continuing the recursion gives:

$$G_t^\lambda = (1-\lambda) \sum_{n=1}^{\infty} \lambda^{n-1} G_t^{(n)}$$

$G_t^{(n)}$ is the n-step return: observe $n$ real rewards, then bootstrap from a value prediction.

- $n=1$: $G_t^{(1)}=r_t+\gamma V(s_{t+1})$
- $n=2$: $G_t^{(2)}=r_t+\gamma r_{t+1}+\gamma^2V(s_{t+2})$
- $n=\infty$: $G_t^{(\infty)}=G_t$, the Monte Carlo return

The target built from $V_{old}+A$ is a weighted average of n-step returns. Larger $\lambda$ relies more on longer spans of observed reward; smaller $\lambda$ relies more on short-horizon bootstrap predictions.

> **What $\lambda=0.95$ does:** The target balances sampled returns against critic predictions. Real future rewards receive substantial weight, while the critic still smooths noise. The prediction reduces variance from environmental randomness, and observed rewards correct bias in the value estimate.

$G_t=V_{old}+A$ is the $\lambda$-return:

- At $\lambda=1$, the terms cancel into the Monte Carlo return $G_t$.
- At $\lambda<1$, it becomes a lower-variance approximation. This helps the critic train more steadily instead of copying one sampled $G_t$ exactly.

The computation chain is:

$$\text{RM score} \xrightarrow{r_t} \text{critic value } V(s_t) \xrightarrow{\text{GAE}} \hat{A}_t$$

The critic's $V(s_t)$ directly affects the signal-to-noise ratio of $A_t$. A biased critic can push the actor in the wrong direction, so its objective also matters.

## 1.4 Training the critic

In a typical LLM-RLHF implementation, the critic and actor use the same Transformer backbone architecture. The critic adds a linear head to map the final hidden state to a scalar. At step $t$, the state $s_t$ contains the prompt and generated prefix $o_{<t}$. The critic outputs $V(s_t)$ and learns to regress the expected cumulative return from that position.

Its objective is:

$$\min_{V} \mathbb{E}_{s_t, R} \left[ (V(s_t) - R)^2 \right]$$

This is ordinary MSE regression. For a prediction $v$ at state $s_t$ and random future return $R$:

$$\min_{v} \mathbb{E}[(v-R)^2]$$

Differentiate with respect to $v$:

$$\frac{d}{dv} \mathbb{E}[(v-R)^2]=2\mathbb{E}[v-R]=0$$

so:

$$v=\mathbb{E}[R]$$

The optimum is therefore $V(s_t)=\mathbb{E}[R\mid s_t]$. It is the conditional expectation of future cumulative return, not a running approximation to one sampled reward. Given the current state, it predicts how much return remains on average. That is why it can serve as the advantage baseline.

## 1.5 PPO training loop

![](/images/从 PPO 到 DPO 再到 GRPO：大模型强化学习对齐技术全景解读/0.png)

PPO training has three phases.

**Step one: rollout and scoring**

Start with an old actor and old critic:

1. Run the actor in the environment, such as generating text, to collect states $s$, actions $a$, and rewards $r$.
2. Score those states with the old critic to obtain $V_{old}(s)$.

**Step two: compute advantages and targets**

The networks do not update during this phase. The collected data produces two fixed tensors:

1. Compute $\hat{A}$ from $r$ and $V_{old}$ with GAE.
2. Compute the target as $\text{Returns}=V_{old}+\hat{A}$.

After this step, $\hat{A}$ and Returns are constants detached from the computation graph. They act as labels.

**Step three: optimization**

The update data is $(s,a,\hat{A},\text{Returns})$. A PPO update loop, usually run several times, trains both networks:

- The actor uses $\hat{A}$ in the clipped policy loss, $L^{CLIP}(\theta)\approx\min(\dots)\cdot\hat{A}$.
- The critic treats Returns as ground truth and minimizes $L^{Value}(\phi)=(V_\phi(s)-\text{Returns})^2$.

PPO is an on-policy algorithm. The advantage asks how much better an action was than the baseline at the time it was sampled. That baseline must come from the critic used during sampling. Updating the critic first would change the baseline and invalidate the previously computed advantage.

The sequence is:

1. Use the old critic to compute Advantage and Returns.
2. Freeze both values.
3. Train the actor from Advantage.
4. Train the new critic from Returns.

***

# 2 DPO: preference learning as classification

![](/images/从 PPO 到 DPO 再到 GRPO：大模型强化学习对齐技术全景解读/1.png)

## 2.1 Main idea

PPO first trains a reward model, then uses RL and a critic to maximize its score. The chain is long: train the RM, score generations, compute advantages, update the actor, and update the critic. Direct Preference Optimization asks whether the policy can be trained from preference data without an explicit reward model and RL loop.

[DPO](https://arxiv.org/abs/2305.18290), introduced by Rafailov et al. at NeurIPS 2023, relies on one relationship: **under a KL constraint, the reward can be expressed as a log-probability ratio between the policy and reference model**. This removes explicit reward modeling and RL training. The derivation has two steps:

1. The KL-constrained optimum has a closed-form policy $\pi^*(y\mid x)$.
2. Substituting that solution into the Bradley-Terry preference model turns reward learning followed by RL into a classification loss over preference pairs.

### 2.1.1 From KL-constrained optimization to a closed-form policy

The RLHF objective maximizes expected reward while using KL divergence to keep the policy near $\pi_{\text{ref}}$:

$$\max_{\pi_\theta} \; \mathbb{E}_{x \sim \mathcal{D},\, y \sim \pi_\theta(\cdot|x)} \left[ r(x, y) \right] - \beta \, \text{KL}\!\left[\pi_\theta(\cdot|x) \;\Vert\; \pi_{\text{ref}}(\cdot|x)\right]$$

$r(x,y)$ is the reward-model score, and $\beta$ controls the KL penalty.

Variational optimization gives the closed-form optimum:

$$\pi^*(y|x) = \frac{1}{Z(x)} \, \pi_{\text{ref}}(y|x) \, \exp\!\left(\frac{r(x,y)}{\beta}\right)$$

where $Z(x)=\sum_y\pi_{\text{ref}}(y\mid x)\exp\!\left(\frac{r(x,y)}{\beta}\right)$ normalizes the probability distribution.

The optimum exponentially reweights the reference policy by reward. Higher-reward responses gain probability, while $\beta$ limits the distance from the reference.

### 2.1.2 Recovering an implicit reward

The closed-form solution maps reward to policy. DPO needs the reverse direction. Taking logs and rearranging gives:

$$r(x,y)=\beta\log\frac{\pi^*(y|x)}{\pi_{\text{ref}}(y|x)}+\beta\log Z(x)$$

The reward is a log-probability ratio plus a prompt-dependent constant. The term $\beta\log Z(x)$ depends on $x$, not the particular response $y$.

### 2.1.3 Substituting the Bradley-Terry model

The Bradley-Terry model expresses the probability that people prefer $y_w$ over $y_l$ for prompt $x$:

$$p(y_w \succ y_l | x) = \sigma\!\left(r(x,y_w)-r(x,y_l)\right)$$

Substitute the implicit reward:

$$p(y_w \succ y_l | x) = \sigma\!\left(\beta \log \frac{\pi^*(y_w|x)}{\pi_{\text{ref}}(y_w|x)} - \beta \log \frac{\pi^*(y_l|x)}{\pi_{\text{ref}}(y_l|x)}\right)$$

$\beta\log Z(x)$ cancels in the difference. The preference probability depends only on the policy-to-reference log ratios, so DPO can optimize the policy from preference data without fitting an explicit reward model.

## 2.2 DPO loss

Taking the negative log-likelihood gives:

$$\mathcal{L}_{\text{DPO}}(\theta) = -\mathbb{E}_{(x, y_w, y_l) \sim \mathcal{D}} \left[ \log \sigma\!\left( \beta \log \frac{\pi_\theta(y_w|x)}{\pi_{\text{ref}}(y_w|x)} - \beta \log \frac{\pi_\theta(y_l|x)}{\pi_{\text{ref}}(y_l|x)} \right) \right]$$

Three properties explain the loss.

**1. Optimization follows the implicit reward gap**

Define $\hat{r}_\theta(x,y)=\beta\log\frac{\pi_\theta(y\mid x)}{\pi_{\text{ref}}(y\mid x)}$. Then:

$$\mathcal{L}_{\text{DPO}} = -\mathbb{E}\left[\log \sigma\!\left(\hat{r}_\theta(x,y_w)-\hat{r}_\theta(x,y_l)\right)\right]$$

Training increases the implicit reward gap between the preferred and rejected responses.

**2. The gradient weights examples by difficulty**

$$\nabla_\theta \mathcal{L}_{\text{DPO}} = -\beta \, \mathbb{E}\!\left[\underbrace{\sigma\!\left(\hat{r}_\theta(x, y_l) - \hat{r}_\theta(x, y_w)\right)}_{\text{implicit weight}} \left[\nabla_\theta \log \pi_\theta(y_w|x) - \nabla_\theta \log \pi_\theta(y_l|x)\right]\right]$$

When the model already separates the preferred response correctly, the reward gap is large, the weight approaches 0, and the gradient shrinks. When it ranks the rejected answer above the preferred one, the weight approaches 1 and the correction grows. DPO spends more effort on preference pairs it still gets wrong.

**3. Only policy probabilities are required**

The loss uses log probabilities from $\pi_\theta$ and $\pi_{\text{ref}}$. It needs no reward-model score, critic, or GAE calculation. Training only requires forward passes to compute log probabilities.

There is no explicit KL term in the written loss, but the derivation begins from a KL-constrained objective. The next section shows how that constraint remains in the formulation.

## 2.3 The implicit KL constraint

DPO incorporates the KL constraint in two ways.

### 2.3.1 The implicit reward is a local contribution to KL

Recall:

$$\hat{r}_\theta(x,y)=\beta\log\frac{\pi_\theta(y|x)}{\pi_{\text{ref}}(y|x)}$$

This log ratio is the contribution at $y$ to $\text{KL}[\pi_\theta\Vert\pi_{\text{ref}}]$. As the policy moves away from the reference, the value grows, and the DPO gradient weight adapts:

- If the policy has moved far in the correct direction, the preferred response already has a much higher implicit reward. The sigmoid approaches 0, suppressing further movement.
- If the policy remains near the reference, the implicit rewards are small. The sigmoid stays near 0.5 and normal updates continue.

### 2.3.2 The closed-form derivation assumes KL-constrained optimality

More fundamentally, DPO starts from the KL-constrained problem in Section 2.1.1. The constraint is encoded in the loss structure:

- $\beta$ controls its strength. A larger $\beta$ makes the implicit reward more sensitive to policy deviation, corresponding to a stronger KL penalty.
- $\pi_{\text{ref}}$ remains an anchor in every log-probability ratio, so deviations always enter the objective.

DPO has not removed the KL constraint. It has moved the constraint from PPO's explicit penalty into the mathematics of the loss. This makes $\beta$ a central hyperparameter for controlling policy drift.

## 2.4 How DPO differs from PPO

| Area | PPO | DPO | Practical effect |
| --- | --- | --- | --- |
| Training pipeline | Three stages: SFT, reward-model training, PPO | Two stages: SFT, DPO | No separate RM training or online RL loop; fewer components can fail. |
| Reward | An explicit neural reward model approximates human preference and scores generations. | The policy contains an implicit reward, $r\propto\log(\pi_\theta/\pi_{\text{ref}})$. | Policy and reward share one probability-ratio framework, reducing mismatch, although this does not eliminate reward hacking. |
| Optimization | Actor-critic training uses advantage estimates and can have high variance. | Binary cross-entropy over preference pairs, optimized by ordinary gradient descent. | Training resembles supervised learning and avoids value estimation. Stability still depends on preference-data quality and coverage. |
| Sampling during training | Continuously samples from the actor, scores with the RM, and computes advantages. | Uses a static offline dataset $(x,y_w,y_l)$. | Removes online sampling and RM inference, but cannot explore new answers during training. |
| Hyperparameters | Actor and critic learning rates, $\gamma$, GAE $\lambda$, clipping $\varepsilon$, KL penalty, and more. | Primarily $\beta$. | A smaller tuning surface, though $\beta$ still controls how far the policy moves. |
| Stability and implementation | Several coupled components and an RL loop make implementation difficult and training unstable. | A direct loss and a training loop close to supervised learning. | Easier to maintain, while results still depend on the data, reference model, and $\beta$. |

The main changes are:

1. A shorter pipeline: no reward-model training or online RL loop; alignment becomes binary classification over preference pairs.
2. Lower resource use: two models instead of four, reducing memory and engineering complexity.
3. Fewer moving parts: no reward-model error propagation, unstable critic training, or on-policy sampling variance.

DPO still depends on the quality and coverage of offline preference data. It cannot explore new response regions through online sampling in the way PPO can. Later methods such as Online DPO and IPO address parts of this limitation.

<br>

GRPO simplifies PPO in a different direction. It retains the RL loop, removes the critic, and estimates advantage by normalizing rewards within a group.

# 3 GRPO: relative advantage without a critic

![](/images/从 PPO 到 DPO 再到 GRPO：大模型强化学习对齐技术全景解读/2.png)

## 3.1 Background: can RL work without a critic?

PPO and DPO provide two different routes to alignment:

- **PPO** keeps the full RL framework. It needs reward-model scores, critic values, GAE, importance sampling, clipping, and four models.
- **DPO** bypasses RL and trains directly from preference data, shortening the pipeline at the cost of online exploration.

There is a middle ground: retain online RL sampling but remove the critic.

[Group Relative Policy Optimization (GRPO)](https://arxiv.org/abs/2402.03300) follows that route. The DeepSeek team introduced it in the 2024 DeepSeekMath paper. Its central idea is:

> Replace the critic's value estimate with a relative comparison among several answers to the same question.

This has two immediate effects:

1. **Lower memory use:** a critic as large as the policy is no longer needed. For a 67B model, this can save nearly half of the model memory used by the RL components.
2. **Fewer training components:** critic training, updates, and synchronization disappear, along with instability from biased value estimates.

The critic supplies PPO with a variance-reducing baseline. Without it, GRPO needs another way to compute $\hat{A}_{i,t}$.

## 3.2 Computing advantage from group comparisons

PPO follows this chain: reward-model score to $r_t$, critic value $V(s_t)$, TD error, GAE, then $\hat{A}_t$. GRPO replaces the critic-dependent middle. It asks how an answer ranks among other answers to the same question.

For one question $q$, GRPO samples $G$ complete responses $o_1,o_2,\dots,o_G$ from $\pi_{\theta_{old}}$. A math problem might receive 16 proposed solutions. The advantage calculation then depends on whether supervision is given only at the outcome or at each reasoning step.

### 3.2.1 Outcome supervision: one advantage for the whole sequence

When the reward model gives one scalar score to each answer, GRPO uses two steps.

**Step one: group normalization**

Score the $G$ answers as $r_1,r_2,\dots,r_G$, then normalize:

$$\tilde{r}_i = \frac{r_i - \text{mean}(\mathbf{r})}{\text{std}(\mathbf{r})}$$

After normalization, $\tilde{r}_i>0$ means the response is above the group mean; $\tilde{r}_i<0$ means it is below. The reward now reflects a response's position within the group instead of only its absolute score.

**Step two: broadcast the advantage**

The reward model provides no token-level signal, so every token in the response receives its sequence's normalized score:

$$\hat{A}_{i,t} = \tilde{r}_i \quad (\text{for every position } t \text{ in sequence } i)$$

If one solution is correct and receives a high $\tilde{r}_i$, every reasoning step in that solution gets the same positive advantage. This is a coarse approximation suited to tasks where only the final answer can be marked right or wrong.

### 3.2.2 Process supervision: accumulated step-level advantage

With a process reward model (PRM), every reasoning step receives its own score.

**Step one: step-wise normalization**

Collect all step rewards from all responses in the group and normalize them using the global mean and standard deviation:

$$\tilde{r}_{i,j} = \frac{r_{i,j} - \text{mean}(\text{GroupRewards})}{\text{std}(\text{GroupRewards})}$$

$r_{i,j}$ is the reward for step $j$ in response $i$.

**Step two: accumulated future return**

Each step has a separate score, so GRPO treats advantage like a return. The current step depends on its own reward and the rewards of later steps:

$$\hat{A}_{i,t} = \sum_{k=j}^{K_i} \tilde{r}_{i,k} \quad (\text{token } t \text{ belongs to step } j)$$

Early reasoning steps such as "let $x$ be..." carry more accumulated weight because they affect every later step. If the rest of the solution is correct, they receive the strongest positive signal. If the reasoning fails later, the failing step and earlier steps receive the resulting penalty.

Under both outcome and process supervision, group statistics replace the critic. The group mean acts as PPO's baseline, and the standard deviation normalizes variance. Once $\hat{A}_{i,t}$ is available, GRPO can use a policy objective similar to PPO.

***

## 3.3 GRPO objective

GRPO retains the importance ratio and clipping used by PPO, with two structural changes:

$$\mathcal{J}_{GRPO}(\theta) = \mathbb{E}[q \sim P(Q), \{o_i\}_{i=1}^{G} \sim \pi_{\theta_{old}}(O|q)] \frac{1}{G} \sum_{i=1}^{G} \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} \left\{ \min \left[ \rho_{i,t} \hat{A}_{i,t}, \; \text{clip}(\rho_{i,t}, 1-\varepsilon, 1+\varepsilon) \hat{A}_{i,t} \right] - \beta \, \text{KL}[\pi_\theta \Vert \pi_{\text{ref}}] \right\}$$

Here, $\rho_{i,t}=\frac{\pi_\theta(o_{i,t}\mid q,o_{i,<t})}{\pi_{\theta_{old}}(o_{i,t}\mid q,o_{i,<t})}$ is the importance sampling ratio.

### 3.3.1 Group sampling and two levels of averaging

PPO generates one response for a prompt and averages token updates. GRPO generates a group of $G$ responses:

- The outer average $\frac{1}{G}\sum_{i=1}^{G}$ covers all responses. PPO has no equivalent group dimension.
- The inner average $\frac{1}{\vert o_i\vert}\sum_{t=1}^{\vert o_i\vert}$ covers tokens within a response, matching PPO's length normalization.

Group sampling supplies the statistics needed for advantage estimation. Averaging gradients across $G$ samples also tends to reduce their variance relative to a single sample.

### 3.3.2 A different source of advantage

|  | PPO | GRPO |
| --- | --- | --- |
| **Advantage source** | Critic $V(s_t)$ + GAE | Normalized group rewards |
| **Additional model** | A critic as large as the actor | None |
| **Granularity** | Per token through chained TD errors | One value per sequence under outcome supervision; accumulated step values under process supervision |

The importance ratio $\rho_{i,t}$, clipping, and KL penalty remain close to PPO. Responses above the group mean have $\hat{A}_{i,t}>0$, so their generation probability increases. Responses below the mean have negative advantage, so their probability decreases. Policy optimization no longer needs a critic.

***

## 3.4 GRPO training loop

### 3.4.1 Three nested loops

![](/images/从 PPO 到 DPO 再到 GRPO：大模型强化学习对齐技术全景解读/3.png)

GRPO training contains three loops, each with a different cadence.

**Outer iteration loop: $T$ iterations**

At the start of each outer iteration:

- Copy the current policy $\pi_\theta$ to $\pi_{\text{ref}}$. The reference remains frozen for the iteration and supplies the KL penalty.
- Optionally update the reward model. DeepSeekMath improves $r_\phi$ alongside policy training so the RM follows changes in the policy.

**Sampling step loop: $N$ steps**

Each collection step does the following:

1. Sample a batch of questions $\mathcal{D}_b$.
2. Copy the current $\pi_\theta$ to a frozen sampling snapshot $\pi_{\theta_{old}}$.
3. Generate $G$ responses per question from $\pi_{\theta_{old}}$.
4. Score them with an RM or PRM and compute $\hat{A}_{i,t}$ as in Section 3.2.
5. Store fixed training data containing questions, responses, advantages, and old-policy probabilities $\pi_{\theta_{old}}(o_{i,t}\mid q,o_{i,<t})$.

**GRPO optimization loop: $\mu$ epochs**

Reuse the fixed data from the sampling loop for $\mu$ policy updates. Split it into mini-batches, evaluate the objective in Section 3.3, and run gradient descent.

The three loops separate the refresh rate of the reference anchor, the cadence of data collection and policy snapshots, and the number of times a batch is reused. Stability and data efficiency can then be tuned separately.

### 3.4.2 Why the importance ratio is necessary

The data comes from $\pi_{\theta_{old}}$, while $\pi_\theta$ changes after each gradient step. It already differs from the sampling policy after the first mini-batch and may be much further away by the end of $\mu$ epochs.

The importance ratio corrects this distribution mismatch:

$$\rho_{i,t}=\frac{\pi_\theta(o_{i,t}\mid q,o_{i,<t})}{\pi_{\theta_{old}}(o_{i,t}\mid q,o_{i,<t})}$$

| Ratio | Meaning | Effect on training |
| --- | --- | --- |
| $\rho>1$ | The new policy is more likely than the old one to generate this token. | For a positive advantage, amplify the gradient and reinforce the behavior. |
| $\rho<1$ | The new policy considers the sampled token less likely. | Reduce the sample's weight and influence on the update. |
| $\rho\approx1$ | The policies agree. | Apply the normal update without correction. |

Clipping then constrains $\rho_{i,t}$ to $[1-\varepsilon,1+\varepsilon]$, keeping one token from contributing an excessively large gradient and holding the update near the old policy.

The ratio corrects the mismatch created by training a new policy on experience from the old one. Clipping limits the size of each update. Together, they allow the same samples to be reused across several epochs. GRPO inherits this mechanism from PPO as part of its remaining RL framework.

## 3.5 Comparing PPO, DPO, and GRPO

PPO, DPO, and GRPO represent full RL, direct offline preference learning, and a lighter RL loop:

<br>

| Dimension | PPO: full RL | DPO: direct preference optimization | GRPO: lighter RL | Difference |
| --- | --- | --- | --- | --- |
| **1. Training pipeline** | SFT → reward-model training → PPO | SFT → DPO | The same broad stages as PPO, but no critic in the RL stage | DPO removes separate RM training; GRPO retains an RM but simplifies the RL stage. |
| **2. Reward** | An explicit RM scores generated text as a proxy for human preference. | No independent RM; $r\propto\log(\pi_\theta/\pi_{\text{ref}})$ defines an implicit reward in the policy. | An explicit RM, with outcome or process supervision. | DPO couples reward and policy, reducing mismatch but losing an independent quality evaluator. |
| **3. Optimization** | Actor-critic training with GAE; gradient estimates can have high variance. | Binary cross-entropy on preference pairs, optimized like supervised learning. | Actor only; group normalization replaces the critic and GAE. | GRPO keeps policy gradients but uses group statistics instead of a value network. |
| **4. Sampling** | Online generations from the current policy, followed by RM scoring and advantage estimation. | No online sampling; training uses static $(x,y_w,y_l)$ data. | Online groups of $G$ responses per question, often 16 or 64. | DPO needs less training-time compute; GRPO still samples online but averages several responses. |
| **5. Models** | Actor + Critic + RM + Reference | Policy + Reference | Actor + RM + Reference | Removing the critic can save roughly 30 to 50 percent of model memory at 70B scale. |
| **6. Hyperparameters** | Actor/critic learning rates, GAE $\lambda$, clipping $\varepsilon$, KL coefficient $\beta$, and others. | Mainly $\beta$. | PPO's $\varepsilon$ and $\beta$, plus group size $G$, but no critic parameters. | DPO has fewer controls; GRPO is sensitive to group size. |
| **7. KL constraint** | Explicit $\beta\cdot\text{KL}[\pi_\theta\Vert\pi_{\text{ref}}]$. | Implicit in $\log(\pi_\theta/\pi_{\text{ref}})$. | Explicit, as in PPO. | $\beta$ remains DPO's main stability control. |
| **8. Stability and complexity** | Several coupled components introduce RM errors, critic bias, and on-policy sampling variance. | A simple loss close to supervised learning. | Keeps PPO sampling and clipping but removes one major source of instability. | Group normalization lowers variance but gives up some token-level detail. |
| **9. Best fit** | General RLHF with fine-grained rewards and online exploration. | Fast alignment when offline preference data is plentiful. | Reasoning tasks with verifiable rewards, especially math and code. | They fit different tasks and resource constraints rather than replacing one another. |
| **10. Representative uses** | InstructGPT, ChatGPT | Llama 2, Zephyr | DeepSeekMath, DeepSeek-R1 |  |

<br>

# 4 Further reading

**Original papers**

- [Proximal Policy Optimization Algorithms (Schulman et al., 2017)](https://arxiv.org/abs/1707.06347), the original PPO paper. It replaces TRPO's second-order constraint with clipping and provides the engineering basis for modern policy-gradient methods.

- [Training language models to follow instructions with human feedback (Ouyang et al., 2022)](https://arxiv.org/abs/2203.02155), the InstructGPT paper that applied PPO to LLM alignment and established the SFT → RM → PPO pipeline.

- [Direct Preference Optimization: Your Language Model is Secretly a Reward Model (Rafailov et al., 2023)](https://arxiv.org/abs/2305.18290), the original DPO paper and its derivation from a KL-constrained optimum to a preference-classification loss.

- [DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (Shao et al., 2024)](https://arxiv.org/abs/2402.03300), the paper that introduced GRPO and tested group-relative advantages on mathematical reasoning.

- [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning (DeepSeek-AI, 2025)](https://arxiv.org/abs/2501.12948), the technical report on using GRPO for large-scale reasoning-model training.

**Additional reading**

- [A General Theoretical Paradigm to Understand Learning from Human Feedback (Azar et al., 2023)](https://arxiv.org/abs/2310.12036), which introduces IPO (Identity Preference Optimization) to address DPO overfitting with limited preference data.

- [Self-Play Fine-Tuning Converts Weak Language Models to Strong Language Models (Chen et al., 2024)](https://arxiv.org/abs/2401.01335), the SPIN method for alignment through self-play without human preference labels.

- [RLHF Workflow: From Reward Modeling to Online RLHF (Dong et al., 2024)](https://arxiv.org/abs/2405.07863), an engineering account of the path from offline DPO to online RLHF.

- [Is DPO Superior to PPO for LLM Alignment? A Comprehensive Study (Xu et al., 2024)](https://arxiv.org/abs/2404.10719), a systematic comparison of PPO and DPO across benchmarks and task types.

<br>

*These are my personal notes on the papers. Corrections are welcome.*
