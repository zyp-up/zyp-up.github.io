---
title: '从 PPO 到 DPO 再到 GRPO：经典大模型强化学习算法解读'
date: 2026-04-15
permalink: /posts/2026/04/ppo-dpo-grpo/
reading_time: "90 minutes read"
tags:
  - Post-training
  - RL
---

> **TL;DR**：在大语言模型（LLM）的 RLHF 里，强化学习是后训练阶段绕不开的一条线。从 OpenAI 提出的 [PPO](https://arxiv.org/abs/1707.06347)，到斯坦福大学提出的 [DPO](https://arxiv.org/abs/2305.18290)，再到 DeepSeek 提出的 [GRPO](https://arxiv.org/abs/2402.03300)，都极大推动了 LLM 的能力涌现。本文将从原理、公式推导到工程实现，系统梳理这三大算法的核心思想与演进逻辑，帮助读者建立完整的技术图谱。

***

# 1 PPO：RLHF 的奠基石

## 1.1 背景与动机

[Proximal Policy Optimization（PPO）](https://arxiv.org/abs/1707.06347)最初由 Schulman 等人于 2017 年提出，*目标是简化 TRPO（Trust Region Policy Optimization）的复杂实现：用 Clip 机制替代二阶 KL 约束，在保持策略更新相对稳定的同时，允许同一批数据多轮复用，从而提高样本效率*。在 LLM 对齐场景中，PPO 常用于 RLHF（Reinforcement Learning from Human Feedback）的强化学习阶段：模型先经过 SFT（Supervised Fine-Tuning）和奖励模型（Reward Model）训练，再用 RL 继续优化人类偏好相关目标。

PPO 要解决的问题很直接：**更新策略时，限制新策略和旧策略之间的偏离程度**。这样可以提高奖励，同时避免一次更新把策略推得太远。

## 1.2 PPO 目标函数：从全局视角出发

理解 PPO，可以先看目标函数。先明确它到底在优化什么，再回到每个符号和训练步骤。

PPO 的目标函数如下：

$$\mathcal{J}_{PPO}(\theta) = \mathbb{E}[q \sim P(Q), o \sim \pi_{\theta_{old}}(O|q)] \frac{1}{|o|} \sum_{t=1}^{|o|} \min \left[ \frac{\pi_\theta(o_t | q, o_{<t})}{\pi_{\theta_{old}}(o_t | q, o_{<t})} A_t, \text{clip}\left(\frac{\pi_\theta(o_t | q, o_{<t})}{\pi_{\theta_{old}}(o_t | q, o_{<t})}, 1-\varepsilon, 1+\varepsilon\right) A_t \right]$$

**逐项拆解**：

| 符号 | 含义 |
| --- | --- |
| \\(q \sim P(Q)\\) | 从问题分布里采样一个问题/提示（prompt），例如一句用户指令。 |
| \\(o \sim \pi_{\theta_{old}}(O \mid q)\\) | 用旧策略生成一个完整输出序列 \\(o = (o_1, \dots, o_{\vert o\vert})\\) |
| \\(\vert o\vert\\) | 输出序列长度；前面的 \\(\frac{1}{\vert o\vert} \sum_{t=1}^{\vert o\vert}\\) 是对**所有 token 取平均**，避免长回答在 loss 上权重更大。 |
| \\(\pi_\theta(o_t \mid q, o_{<t})\\) | 当前待更新策略 \\(\pi_\theta\\) 在前缀 \\((q, o_{<t})\\) 下生成第 \\(t\\) 个 token 是 \\(o_t\\) 的概率。 |
| \\(\pi_{\theta_{\text{old}}}(o_t \mid q, o_{<t})\\) | 旧策略下的对应概率，用来构造**重要性采样比率**：\\(r_t(\theta) = \frac{\pi_\theta(o_t \mid q, o_{<t})}{\pi_{\theta_{\text{old}}}(o_t \mid q, o_{<t})}\\) |
| \\(A_t\\) | 第 \\(t\\) 个 token 的 **advantage（优势函数）**，一般由 GAE 计算：\\(A_t \approx (\text{当前路径未来回报}) - (\text{价值网络给出的 baseline})\\) |
| \\(\varepsilon\\) | PPO 的 clip 超参数，典型值 \\(0.1 \sim 0.2\\) |

直觉上，它在所有采样 token 上计算「新策略相比旧策略的概率变化」与「优势值」的乘积，再用 clip 机制限制单次更新幅度。

这个公式里有几个必要组件：

1. **重要性采样比率** \\(r_t(\theta) = \frac{\pi_\theta}{\pi_{\theta_{old}}}\\)：衡量新旧策略的差异

2. **优势函数** \\(A_t\\)：衡量这一步动作比「平均水平」好了多少
    - \\(A_t > 0\\)：这一步比平均表现更好，应该增加对应动作概率
    - \\(A_t < 0\\)：这一步比平均表现差，应该减小该动作概率

3. **Clip 机制**：\\(\text{clip}(r_t, 1 - \varepsilon, 1 + \varepsilon)\\) 把比率 \\(r_t(\theta)\\) 截断在区间 \\([1 - \varepsilon, 1 + \varepsilon]\\) 内，限制单步更新幅度，避免策略离旧策略太远。
    - 当 \\(A_t > 0\\)（想鼓励这一动作）时，\\(r_t\\) 不允许大于 \\(1 + \varepsilon\\)，否则取被截断的版本
    - 当 \\(A_t < 0\\)（想惩罚这一动作）时，\\(r_t\\) 不允许小于 \\(1 - \varepsilon\\)

4. **Clip机制与重要性采样比率** \\(r_t(\theta) = \frac{\pi_\theta(o_t \mid q, o_{<t})}{\pi_{\theta_{\text{old}}}(o_t \mid q, o_{<t})}\\) **的配合**

**PPO 和下文中的 GRPO 都会用重要性采样比率来放大或缩小采样出的 logprob 梯度，再通过 clipping 限制更新幅度。**

其中，\\(A_t\\)（优势函数）决定每个 token 的更新方向和力度。下面先看数据如何采样，再推导 \\(A_t\\) 的计算过程。

## 1.3 数据采样与 \\(A_t\\) 计算

### 1.3.1 采样轨迹（只用 old policy）

首先，用旧策略 \\(\pi_{\theta_{old}}\\) 采样一条完整输出：

$$o = (o_1, \cdots, o_T) \sim \pi_{\theta_{old}}(O|q)$$

然后，用 Reward Model 对整条输出打分，结合 KL 惩罚得到每一步的奖励分数：

$$r_{t}=r_{\varphi}(q,o_{\leq t})-\beta\log\frac{\pi_{\theta}(o_{t}|q,o_{<t})}{\pi_{\text{ref}}(o_{t}|q,o_{<t})}$$

这里的 KL 惩罚项用来约束策略不要为了追求高奖励而偏离参考模型太远。

### 1.3.2 用 GAE 从 reward + value 得到优势 \\(A_t\\)

有了每一步的奖励 \\(r_t\\)，还需要知道这一步动作相对基线好多少。这就是优势函数 \\(A_t\\) 要衡量的量。

要算 \\(A_t\\)，光有奖励不够——我们还需要一个「平均水平」的参照物。这个参照物就是状态价值函数 \\(V(s_t)\\)，它由一个专门的 **Critic 网络（也叫 Value Network）** 负责输出。简单来说：

- **Reward Model**：给完整回答打分，提供即时奖励信号 \\(r_t\\)（在 RL 阶段冻结不更新）

- **Critic 网络**：预测从当前位置到序列结束的**期望累积回报** \\(V(s_t) = \mathbb{E}[G_t \mid s_t]\\)，作为计算 Advantage 的 baseline（与 Actor 同步训练）

> 这里先**假设 Critic 已经训好**、能给出合理的 \\(V(s_t)\\)，先把 \\(A_t\\) 的计算逻辑讲清楚。Critic 本身的训练放到 1.4 节。

在强化学习中，状态价值 \\(V(s_t)\\) 的直观含义是：**从当前状态开始，到序列结束时的期望折扣回报**。

$$V(s_t) \approx r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \dots$$

利用数学上的递归关系，我们可以把它写成：

$$V(s_t) \approx \underbrace{r_t}_{\text{即时奖励}} + \underbrace{\gamma V(s_{t+1})}_{\text{后续价值}}$$

**第一步：计算 TD Error（时序差分误差** \\(\delta_t\\)**）**

$$\delta_t = r_t + \gamma V(s_{t+1}) - V(s_t)$$

各项含义：

- \\(r_t\\)：当前这一步获得的即时奖励（通常是 KL 惩罚，最后一步才有大分）
- \\(V(s_t)\\)：**Critic 认为**当前状态值多少分
- \\(V(s_{t+1})\\)：走到下一步后，**Critic 认为**那个新状态值多少分
- \\(\gamma\\)：折扣因子（比如 0.99），控制未来奖励在当前估值里的权重

**直观理解**：如果 \\(\delta_t > 0\\)，说明 \\(r_t + \gamma V(s_{t+1})\\) 比 \\(V(s_t)\\) 更高，也就是这一步的结果好于 Critic 原来的估计。

**第二步：计算 GAE 优势** \\(\hat{A}_t\\)

TD Error 只看一步。GAE 会把当前误差和后续误差按折扣累加起来：

$$\hat{A}_t = \delta_t + (\gamma \lambda)\delta_{t+1} + (\gamma \lambda)^2 \delta_{t+2} + \cdots + (\gamma \lambda)^{T-t} \delta_T$$

\\(\lambda\\)：这是 GAE 特有的参数（比如 0.95），用于平衡方差和偏差

- **含义**：当前这一步的优势，不仅取决于这一步走得好不好（\\(\delta_t\\)），还取决于它是否让后面几步也容易走好

**PPO 的 Advantage 一句话总结**：

$$\text{Advantage} = \text{加权累加的 (现实 - 预期)}$$

### 1.3.3 计算每个位置的「真实回报」

**目标公式**： \\(\text{Target}_t = V(s_t) + \hat{A}_t\\)

这个公式看起来简单，但它和 n-step return 的关系需要展开看。

**准备公式**：

回顾两个定义：

- TD Error（\\(\delta_t\\)）： \\(\delta_t = r_t + \gamma V(s_{t+1}) - V(s_t)\\)
- GAE（\\(\hat{A}_t\\)）： \\(\hat{A}_t = \sum_{k=0}^{\infty} (\gamma \lambda)^k \delta_{t+k} = \delta_t + (\gamma\lambda)\delta_{t+1} + (\gamma\lambda)^2\delta_{t+2} + \dots\\)

**展开推导**：

把 \\(\text{Target}_t = V(s_t) + \hat{A}_t\\) 展开。先写前两项，看 \\(V\\) 项如何抵消，以及剩余项如何留下来。

$$\begin{aligned} \text{Target}_t &= \mathbf{V(s_t)} \\ &+ \underbrace{(r_t + \gamma V(s_{t+1}) - \mathbf{V(s_t)})}_{\delta_t} \\ &+ (\gamma\lambda) \underbrace{(r_{t+1} + \gamma V(s_{t+2}) - V(s_{t+1}))}_{\delta_{t+1}} \\ &+ (\gamma\lambda)^2 \delta_{t+2} + \dots \end{aligned}$$

**第一步整理**：第一行的 \\(V(s_t)\\) 和第二行的 \\(-V(s_t)\\) 抵消。剩下：

$$\text{Target}_t = r_t + \gamma V(s_{t+1}) + (\gamma\lambda)(r_{t+1} + \gamma V(s_{t+2}) - V(s_{t+1})) + \dots$$

**第二步整理（观察** \\(V(s_{t+1})\\)**）**：

我们把含有 \\(V(s_{t+1})\\) 的项提取出来。一项是前面的 \\(\gamma V(s_{t+1})\\)，一项是后面的 \\(-(\gamma\lambda) V(s_{t+1})\\)。

$$\gamma V(s_{t+1}) - \gamma\lambda V(s_{t+1}) = \gamma (1-\lambda) V(s_{t+1})$$

于是公式变成了：

$$\begin{aligned} \text{Target}_t &= r_t + \gamma (1-\lambda)V_{t+1} \\ &+ \gamma\lambda r_{t+1} + (\gamma\lambda) \gamma (1-\lambda)V_{t+2} \\ &+ (\gamma\lambda)^2 \left[ r_{t+2} + \gamma (1-\lambda)V_{t+3} + \dots \right] \end{aligned}$$

**最终的一般形式**：继续递推，可以得到：

$$G_t^\lambda = (1-\lambda) \sum_{n=1}^{\infty} \lambda^{n-1} G_t^{(n)}$$

这里的 \\(G_t^{(n)}\\) 代表 n-step Return（看 \\(n\\) 步真实奖励，后面用预测）：

- \\(n=1\\)： \\(G_t^{(1)} = r_t + \gamma V(s_{t+1})\\)（只看 1 步）
- \\(n=2\\)： \\(G_t^{(2)} = r_t + \gamma r_{t+1} + \gamma^2 V(s_{t+2})\\)（看 2 步）
- \\(n=\infty\\)： \\(G_t^{(\infty)} = G_t\\)（Monte Carlo，全看真实）

**推导结论**：利用 \\(V_{old} + A\\) 构造出来的 Target，本质上是**多个 n 步回报的加权平均值**。权重由 \\(\lambda\\) 决定：越大，越依赖更长跨度的真实奖励；越小，越依赖短期 bootstrap 预测。

> **\\(\lambda = 0.95\\) 的作用**
> 构造 \\(\text{Target} = V_{old} + A\\) 是为了在真实采样回报和 Critic 预测之间做折中。\\(\lambda=0.95\\) 时，后续真实奖励占更大权重，Critic 的预测仍然参与平滑噪声。
> - 通过引入 \\(V\\)（预测）：我们削减了 \\(G_t\\) 中因为环境随机性带来的巨大方差
> - 通过引入 \\(r\\)（现实）：我们修正了 \\(V\\) 可能会有的偏差

其中 \\(\gamma\\) 是折扣因子（通常接近 1）， \\(r_t\\) 是第 \\(t\\) 步获得的奖励。

\\(G_t = V_{old} + A\\) 构造的是 \\(\lambda\\)-Return：

- 如果 \\(\lambda = 1\\)，由于数学上的抵消，它就退化为蒙特卡洛回报 \\(G_t\\)

- 如果 \\(\lambda < 1\\)，它是 \\(G_t\\) 的一个低方差近似版。我们故意用这个公式，是为了让 Critic 学得更稳，而不是完全照搬某一次采样的 \\(G_t\\)

这一节的计算链条可以概括为：

$$\text{RM 打分} \xrightarrow{r_t} \text{结合 Critic 的 } V(s_t) \xrightarrow{\text{GAE}} \hat{A}_t$$

在这个链条中，Critic 给出的 \\(V(s_t)\\) 会直接影响 \\(A_t\\) 的信噪比。如果 Critic 预测偏差很大，Actor 的更新方向也会变差。因此还需要看 Critic 本身的训练目标。

## 1.4 训练 Critic 网络

在 1.3 节中，Critic 提供的 \\(V(s_t)\\) 贯穿了整个 Advantage 计算过程。现在我们来看它自身是怎么训练的。

**Critic 的架构**：在 LLM-RLHF 的典型实现中，Critic 与 Actor **共享同一个 Transformer backbone**，在最后一层额外接一个**线性头**（将 hidden state 映射到标量）。在每个时间步 \\(t\\)，Critic 利用当前状态 \\(s_t\\)（即 prompt + 已生成序列 \\(o_{<t}\\) 经过 Transformer 编码后的隐藏表示）输出 \\(V(s_t)\\)，其训练目标是**回归拟合从该位置出发的期望累积回报**。

Value Network 的训练目标是：

$$\min_{V} \mathbb{E}_{s_t, R} \left[ (V(s_t) - R)^2 \right]$$

这是一个标准的 MSE 回归问题，我们想找到最优函数 \\(V^*(s_t)\\)。

设模型在某一状态 \\(s_t\\) 上预测为 \\(v\\)，真实未来回报是随机变量 \\(R\\)，则目标变成：

$$\min_{v} \mathbb{E}[(v - R)^2]$$

对 \\(v\\) 求导：

$$\frac{d}{dv} \mathbb{E}[(v - R)^2] = 2\mathbb{E}[v - R] = 0$$

解得：

$$v = \mathbb{E}[R]$$

因此，最优 \\(V(s_t)\\) 不是某次 \\(R\\)，也不是逼近 \\(R\\) 的趋势曲线，而是： \\(V(s_t) = \mathbb{E}[R \mid s_t]\\)

> **这里容易混淆的一点**：\\(V(s_t)\\) 是对未来累积回报的**条件期望**，也就是一个预测基线，而不是 reward 的逐步逼近值。它不是要拟合某一次具体采样的 reward，而是根据当前 state 估计「平均而言，后面还能拿多少回报」。这也是它能作为 1.3 节中 Advantage 基线的原因。

## 1.5 PPO 训练流程

![](/images/从 PPO 到 DPO 再到 GRPO：大模型强化学习对齐技术全景解读/0.png)

综上，PPO 的训练可以分为三个阶段：

**第一步：采样与打分（Rollout）**

此时我们有旧的策略网络（Actor）和旧的价值网络（Critic）。

1. 让 Actor 去环境里跑（比如生成文本），拿到状态 \\(s\\)、动作 \\(a\\)、奖励 \\(r\\)

2. 用旧的 Critic 对这些状态打分，得到 \\(V_{old}(s)\\)

**第二步：计算优势和目标（Calculation）**

在这个阶段，网络是**不更新**的。我们利用刚才收集的数据计算出两个**固定的张量**：

1. **计算 Advantage（\\(\hat{A}\\)）**：利用 \\(r\\) 和 \\(V_{old}\\)，套用 GAE 公式算出优势

2. **计算 Returns（Target）**：直接用公式 \\(\text{Returns} = V_{old} + \hat{A}\\)

> **注意**：这一步做完后，\\(\hat{A}\\) 和 \\(\text{Returns}\\) 就变成了**常数**（不再带有计算图的梯度），也就是我们常说的 label。

**第三步：训练更新（Optimization）**

现在的输入数据是：\\((s, a, \hat{A}, \text{Returns})\\)。

进入 PPO 的 Update Loop（通常会循环几次）：

- **Actor 的任务**：利用第二步算好的 \\(\hat{A}\\) 来计算 PPO 的 Policy Loss（那个截断的 CLIP 公式），更新 Actor 参数 \\(L^{CLIP}(\theta) \approx \min(\dots) \cdot \hat{A}\\)

- **Critic 的任务**：利用第二步算好的 \\(\text{Returns}\\) 作为真值（GT），更新 Critic 参数 \\(L^{Value}(\phi) = (V_\phi(s) - \text{Returns})^2\\)

**为什么要这样？**

因为 PPO 是 **On-Policy（同策略）** 算法。Advantage 的含义是："在当时那个时刻，采取这个动作比平均水平好了多少"。这个"平均水平"（基线）必须是采样时的那个 Critic 给出的。如果你先更新了 Critic，基线变了，那么你之前算的 Advantage 就没意义了（偏差会变大），数学上就不成立了。

**总结流程图**：

1. 旧 Critic → 算出 Advantage 和 Returns

2. 锁定这两个值（当作固定数字）

3. Advantage → 用来训练 Actor

4. Returns → 用来训练新 Critic

***

# 2 DPO：把偏好学习改写成分类问题

![](/images/从 PPO 到 DPO 再到 GRPO：大模型强化学习对齐技术全景解读/1.png)

## 2.1 基本思路与主要发现

在 PPO 的框架中，需要先训练 Reward Model 对回复打分，再用 RL 算法（配合 Critic 网络）去最大化这个打分。整个链条较长：训练 RM → RM 打分 → 计算 Advantage → 更新 Actor → 同步更新 Critic。DPO（Direct Preference Optimization）要问的是：

> *能不能跳过 Reward Model 和 RL 过程，直接从人类偏好数据中优化策略？*

答案是可以的。[DPO（Direct Preference Optimization）](https://arxiv.org/abs/2305.18290)由 Rafailov 等人于 2023 年在 NeurIPS 上提出。它利用一个关键关系：**在 KL 约束下，奖励函数可以用策略模型与参考模型的对数概率比表示**，因此可以跳过显式奖励建模和 RL 训练。推导分两步：

1. **KL 约束下的最优策略存在闭式解**——从 RLHF 的优化目标出发，可以推导出一个显式的 \\(\pi^*(y \mid x)\\) 表达式；

2. **将这个闭式解代入 Bradley-Terry 偏好模型**，就能把"学习 Reward → 再做 RL"的两阶段流程，简化为一个直接在偏好数据上训练策略的分类损失。

下面沿着这两步推导 DPO 的训练目标。

### 2.1.1 从 KL 约束优化到最优策略的闭式解

RLHF 的优化目标是：在最大化期望奖励的同时，不让策略偏离参考策略 \\(\pi_{\text{ref}}\\) 太远（用 KL 散度约束）：

$$\max_{\pi_\theta} \; \mathbb{E}_{x \sim \mathcal{D},\, y \sim \pi_\theta(\cdot|x)} \left[ r(x, y) \right] - \beta \, \text{KL}\!\left[\pi_\theta(\cdot|x) \;\Vert \; \pi_{\text{ref}}(\cdot|x)\right]$$

其中 \\(r(x, y)\\) 是 Reward Model 给出的奖励， \\(\beta\\) 控制 KL 惩罚强度。

对于这个 KL 约束优化问题，可以用变分法推导出其最优策略的闭式解：

$$\pi^*(y|x) = \frac{1}{Z(x)} \, \pi_{\text{ref}}(y|x) \, \exp\!\left(\frac{r(x,y)}{\beta}\right)$$

其中 \\(Z(x) = \sum_y \pi_{\text{ref}}(y \mid x) \exp\!\left(\frac{r(x,y)}{\beta}\right)\\) 是归一化常数（配分函数），确保 \\(\pi^*\\) 仍然是合法的概率分布。

> **直觉**：最优策略在参考策略的基础上，按奖励大小做指数级的"re-weighting"——奖励越高的回复概率越大，但受到 \\(\beta\\) 的约束不会偏离太远。

### 2.1.2 反解出隐式奖励函数

上面的闭式解建立了"奖励 → 最优策略"的映射，但 DPO 需要的是反方向：**从策略反推出奖励**。对闭式解取对数并移项，可以得到：

$$r(x, y) = \beta \log \frac{\pi^*(y|x)}{\pi_{\text{ref}}(y|x)} + \beta \log Z(x)$$

这就是 DPO 的关键等式：**奖励可以写成策略与参考策略的对数概率比，再加上只依赖 prompt 的常数项**。注意 \\(\beta \log Z(x)\\) 只依赖于 prompt \\(x\\)，与具体回复 \\(y\\) 无关。

### 2.1.3 代入 Bradley-Terry 模型，消去配分函数

人类偏好通常建模为 Bradley-Terry 模型：给定 prompt \\(x\\) 和一对回复 \\((y_w, y_l)\\)，人类更偏好 \\(y_w\\) 的概率为：

$$p(y_w \succ y_l | x) = \sigma\!\left(r(x, y_w) - r(x, y_l)\right)$$

其中 \\(\sigma\\) 是 sigmoid 函数。将 2.1.2 中的隐式奖励代入：

$$p(y_w \succ y_l | x) = \sigma\!\left(\beta \log \frac{\pi^*(y_w|x)}{\pi_{\text{ref}}(y_w|x)} - \beta \log \frac{\pi^*(y_l|x)}{\pi_{\text{ref}}(y_l|x)}\right)$$

注意这里的变化：\\(\beta \log Z(x)\\) **在做差时消去了**。因此不需要计算配分函数，偏好概率只由策略与参考策略的对数概率比决定。

配分函数被消去后，DPO 就可以绕过 Reward Model 的显式训练，直接在偏好数据上优化策略。基于这个结果，可以写出 DPO 的训练损失函数。

## 2.2 DPO 损失函数

将 2.1.3 中的偏好概率取负对数似然，就得到 DPO 的训练目标：

$$\mathcal{L}_{\text{DPO}}(\theta) = -\mathbb{E}_{(x, y_w, y_l) \sim \mathcal{D}} \left[ \log \sigma\!\left( \beta \log \frac{\pi_\theta(y_w|x)}{\pi_{\text{ref}}(y_w|x)} - \beta \log \frac{\pi_\theta(y_l|x)}{\pi_{\text{ref}}(y_l|x)} \right) \right]$$

这个损失函数可以从三点理解：

**1. 隐式奖励差驱动优化**

定义隐式奖励为 \\(\hat{r}_\theta(x, y) = \beta \log \frac{\pi_\theta(y \mid x)}{\pi_{\text{ref}}(y \mid x)}\\)，则损失可以简写为：

$$\mathcal{L}_{\text{DPO}} = -\mathbb{E}\left[\log \sigma\!\left(\hat{r}_\theta(x, y_w) - \hat{r}_\theta(x, y_l)\right)\right]$$

优化方向很直接：**拉大好回复与坏回复之间的隐式奖励差**。

**2. 梯度自带难度感知**

对 \\(\mathcal{L}_{\text{DPO}}\\) 求梯度，可以得到：

$$\nabla_\theta \mathcal{L}_{\text{DPO}} = -\beta \, \mathbb{E}\!\left[\underbrace{\sigma\!\left(\hat{r}_\theta(x, y_l) - \hat{r}_\theta(x, y_w)\right)}_{\text{隐式权重}} \left[\nabla_\theta \log \pi_\theta(y_w|x) - \nabla_\theta \log \pi_\theta(y_l|x)\right]\right]$$

其中的隐式权重 \\(\sigma(\hat{r}_\theta(x, y_l) - \hat{r}_\theta(x, y_w))\\) 起到了难度加权的作用：当模型**已经能正确区分好坏回复**（隐式奖励差大），这个权重趋近于 0，梯度很小；当模型**判断错误**（给坏回复的隐式奖励更高），权重趋近于 1，纠正力度更大。DPO 因此会更关注当前仍分不清的偏好对。

**3. 仅依赖策略概率，无需额外模型**

整个损失只涉及 \\(\pi_\theta\\) 和 \\(\pi_{\text{ref}}\\) 的对数概率——不需要 Reward Model 打分，不需要 Critic 网络，不需要 GAE 计算。训练时只需做一次前向传播计算 log-prob 即可。

DPO 损失函数里没有显式 KL 项，但推导本身来自 KL 约束优化问题。因此还需要看这个约束是如何进入损失的。

## 2.3 KL 散度惩罚的隐式机制

DPO 的损失函数中看不到显式的 KL 惩罚项，但这并不意味着 KL 约束不存在。它以两种方式进入损失设计。

### 2.3.1 隐式奖励本身就是 KL 的"局部梯度"

回顾隐式奖励的定义：

$$\hat{r}_\theta(x, y) = \beta \log \frac{\pi_\theta(y|x)}{\pi_{\text{ref}}(y|x)}$$

这个对数比值正是 KL 散度 \\(\text{KL}[\pi_\theta \Vert \pi_{\text{ref}}]\\) 在点 \\(y\\) 上的"局部贡献"。当策略 \\(\pi_\theta\\) 偏离参考策略时，这个值会增大，而 DPO 的梯度权重 \\(\sigma(\hat{r}_\theta(y_l) - \hat{r}_\theta(y_w))\\) 会自动调节：

- **Case 1：策略明显偏离参考策略**。此时 \\(\hat{r}_\theta\\) 的绝对值很大，如果偏离方向正确（好回复的隐式奖励 >> 坏回复），sigmoid 趋近 0，梯度被抑制，策略继续远离参考模型的动力会减弱。

- **Case 2：策略接近参考策略**。 \\(\hat{r}_\theta\\) 较小，sigmoid 接近 0.5，梯度正常更新，策略仍可以在参考模型附近调整。

### 2.3.2 约束来源：闭式解的推导前提

更根本地说，DPO 损失的推导起点就是 KL 约束优化问题（2.1.1）。整个损失函数是在 **"最优策略满足 KL 约束"这一前提下** 推导出来的，因此 KL 约束已经被"编码"进了损失的数学结构中：

- \\(\beta\\) 参数直接控制约束强度：\\(\beta\\) 越大，隐式奖励对策略偏离越敏感，等价于更强的 KL 惩罚；

- 参考策略 \\(\pi_{\text{ref}}\\) 的对数概率始终作为"锚点"出现在损失中，任何偏离都会被自动计入优化目标。

> **小结**：DPO 并非"没有 KL 约束"，而是将 KL 约束从 PPO 的显式惩罚项，转化到了损失函数的数学结构里。这也意味着 \\(\beta\\) 的调参很关键，因为它基本承担了控制策略偏离强度的角色。

## 2.4 DPO 相对于 PPO 的改进与效果

理解了 DPO 的理论基础和隐式约束机制后，可以比较它与 PPO 在训练流程、模型需求和优化特性上的差异：

| 改进点 (Improvement Area) | PPO (传统RLHF方法) | DPO (直接偏好优化) | 带来的效果改善 (Resulting Improvement) |
| --- | --- | --- | --- |
| 1. 训练流程 (Training Pipeline) | 复杂的三阶段流程：1. 监督微调 (SFT) 2. 训练奖励模型 (RM) 3. PPO强化学习微调 | 简化的两阶段流程：1. 监督微调 (SFT) 2. DPO直接优化 | 去掉独立 RM 训练和在线 RL 循环后，工程链路更短，出错面也更小。 |
| 2. 奖励机制 (Reward Mechanism) | 显式的奖励模型：需要训练一个独立的神经网络来拟合人类偏好，给生成的文本打分。这个模型是真实奖励的一个代理（Proxy）。 | 隐式的奖励模型：不需要独立的奖励模型。奖励函数通过r ∝ log(π_θ / π_ref)被解析地、隐式地定义在策略模型本身。 | 奖励和策略被放进同一个概率比框架里，减少了 RM 与策略模型之间的 mismatch；但这不等于彻底消除 reward hacking，只是换了一类约束方式。 |
| 3. 优化算法 (Optimization Algorithm) | Actor-Critic算法：PPO需要维护一个策略网络（Actor）和一个价值网络（Critic），通过优势函数（Advantage Estimation）来计算梯度，方差较大。 | 分类损失函数：DPO将问题转化为二元交叉熵损失，可以直接通过梯度下降优化。 | 训练形式更接近监督学习，不再需要价值函数估计；稳定性通常更好，但前提是偏好数据质量和覆盖度足够。 |
| 4. 训练过程中的采样 (Sampling During Training) | 需要在训练中动态采样：PPO的训练循环中，需要不断从当前策略模型（Actor）中采样生成新的回答，然后用奖励模型打分，计算优势值。这是一个主要的计算瓶颈。 | 无需在训练循环中采样：DPO的训练完全基于静态的、离线的偏好数据集 (prompt, y_w, y_l) 进行。 | 训练阶段省掉在线采样和 RM 打分，计算开销更低；代价是无法在训练过程中主动探索新回复。 |
| 5. 超参数调优 (Hyperparameter Tuning) | 超参数众多且敏感：需要仔细调整Actor和Critic的学习率、折扣因子gamma、GAE的lambda、PPO的clipping epsilon、KL散度惩罚系数等，调优非常困难。 | 超参数更少：最关键的超参数是 β，它直接控制KL散度强度。 | 调参面缩小了，但 β 仍会明显影响偏离参考模型的程度，不能理解成完全免调参。 |
| 6. 稳定性和实现难度 (Stability & Implementation Complexity) | 实现复杂，训练不稳定：PPO的实现涉及多个组件和复杂的计算流程，代码容易出错。RL训练过程本身也可能非常不稳定。 | 实现相对简单：DPO损失函数的实现很直接，训练过程更接近普通监督学习。 | 代码和训练链路更容易维护；但最终效果仍取决于偏好数据、参考模型和 β 设置。 |

DPO 相比 PPO 的主要变化可以概括为三点：

1. **流程更短**：去掉了 RM 训练和 RL 采样循环，将对齐训练改写为偏好对上的二分类；

2. **资源开销更低**：从 4 个模型缩减到 2 个，显存需求和工程复杂度下降；

3. **训练变量更少**：不再引入 RM 质量传导误差、Critic 训练不稳定和 on-policy 采样方差这些因素。

DPO 的边界也很清楚：它依赖离线偏好数据的质量和覆盖度，无法像 PPO 那样通过在线采样持续探索新的回复空间。Online DPO、IPO 等后续工作基本都在补这类问题。

<br>

GRPO 则从另一个角度简化 PPO：**保留 RL 框架但去掉 Critic 网络**，用组内归一化的方式直接估计优势函数。

# 3 GRPO：无 Critic 的相对优势估计

![](/images/从 PPO 到 DPO 再到 GRPO：大模型强化学习对齐技术全景解读/2.png)

## 3.1 背景与动机：去掉 Critic，还能做 RL 吗？

在前两章中，我们看到了两条通往对齐的路径：

- **PPO**：完整的 RL 框架，链条较长：需要 RM 打分、Critic 估值、GAE 计算、重要性采样与 Clip，同时维护 4 个模型；

- **DPO**：绕过 RL，用偏好数据直接优化策略，流程更短，但放弃了在线采样的探索能力。

自然会有一个中间方案：**保留 RL 的在线采样，同时去掉最重的 Critic 网络**。

[Group Relative Policy Optimization（GRPO）](https://arxiv.org/abs/2402.03300)就是沿着这个方向设计的。它由 DeepSeek 团队在 2024 年的 DeepSeekMath 论文中提出，核心做法可以概括为：

> **用"同一道题的多个回答之间的相对比较"来替代 Critic 网络的价值估计。**

这样做有两个直接结果：

1. **节省显存**：不再需要与策略模型同等规模的 Critic 网络（对于 67B 的模型，这意味着省下接近一半的显存）。

2. **减少训练组件**：省去 Critic 的训练、更新和同步维护，也少了 Critic 估值偏差带来的不稳定来源。

问题随之变成：PPO 中 Critic 的作用是提供基线（baseline）来降低梯度方差，去掉它之后，GRPO 如何计算优势函数 \\(\hat{A}_{i,t}\\)？

## 3.2 Advantage 计算：用组内比较替代 Critic

回顾 PPO 中优势函数的计算链条：**RM 打分 →** \\(r_t\\) **→ 结合 Critic 的** \\(V(s_t)\\) **→ TD Error → GAE →** \\(\hat{A}_t\\)。GRPO 把中间涉及 Critic 的部分替换掉，不再问"这个回答比 Critic 预测的好多少"，而是问"**这个回答在同一组回答中排第几**"。

具体来说，GRPO 对同一个问题 \\(q\\) 从旧策略 \\(\pi_{\theta_{\text{old}}}\\) 采样 \\(G\\) 个完整回答 \\(o_1, o_2, \dots, o_G\\)（例如同一道数学题生成 16 种解法），然后根据监督信号的粒度，分为两种计算方式。

### 3.2.1 结果监督（Outcome Supervision）：整条序列共享一个优势

当使用 Reward Model 对每个回答给出一个整体标量分数时，计算分两步：

**第一步：组内标准化（Group Normalization）**

用 RM 分别对 \\(G\\) 个回答打分，得到 \\(r_1, r_2, \dots, r_G\\)，然后做标准化处理：

$$\tilde{r}_i = \frac{r_i - \text{mean}(\mathbf{r})}{\text{std}(\mathbf{r})}$$

标准化之后， \\(\tilde{r}_i > 0\\) 意味着"比组内平均水平好"， \\(\tilde{r}_i < 0\\) 意味着"比平均水平差"。奖励信号不再只看绝对值，而是看它相对于同组其他回答的位置。

**第二步：优势广播（Broadcasting）**

由于 RM 只给出整条回答的最终得分，没有逐 token 的细粒度信号，GRPO 采用最直接的广播方式：序列中每个 token 的优势值都等于该序列的归一化得分：

$$\hat{A}_{i,t} = \tilde{r}_i \quad (\text{对于序列 } i \text{ 中的所有位置 } t)$$

> **直觉**：如果一道题的某个解法最终答对了（\\(\tilde{r}_i\\) 大），这个解法中的每一步推理都会得到相同的正向优势。这是粗粒度近似，尤其适合只有最终答案对错信号的任务。

### 3.2.2 过程监督（Process Supervision）：逐步累积优势

当使用 Process Reward Model（PRM）对每个推理步骤分别打分时，优势的计算可以更加精细：

**第一步：步骤级标准化（Step-wise Normalization）**

GRPO 收集组内所有回答的所有步骤奖励，计算全局均值和标准差进行标准化：

$$\tilde{r}_{i,j} = \frac{r_{i,j} - \text{mean}(\text{GroupRewards})}{\text{std}(\text{GroupRewards})}$$

其中 \\(r_{i,j}\\) 是第 \\(i\\) 个回答中第 \\(j\\) 个步骤的奖励。

**第二步：计算累积优势（Accumulated Future Return）**

与结果监督不同，过程监督下每一步都有独立评分。此时 GRPO 借鉴强化学习中"回报"（Return）的思想：当前步骤的优势不仅取决于自身得分，也取决于后续步骤的表现。

$$\hat{A}_{i,t} = \sum_{k=j}^{K_i} \tilde{r}_{i,k} \quad (\text{其中 token } t \text{ 属于第 } j \text{ 个步骤})$$

这意味着：早期的推理步骤（如"设 \\(x\\) 为…"）承担了更大的优势权重，因为它们影响了后续所有步骤的方向。如果后续推理全部正确，早期步骤会获得最高的正向激励；反之，如果在某一步开始出错，该步骤及之前的步骤都会受到惩罚。

> **小结**：无论是结果监督还是过程监督，GRPO 都是在**用组内统计量替代 Critic 的价值估计**。组均值充当 PPO 中 Critic 的"基线"角色，标准差负责方差归一化。有了优势函数 \\(\hat{A}_{i,t}\\)，就可以写出 GRPO 的目标函数。

***

## 3.3 GRPO 目标函数

GRPO 的目标函数在形式上与 PPO 很接近：同样使用重要性采样比率和 Clip 机制，但有两个结构变化：

$$\mathcal{J}_{GRPO}(\theta) = \mathbb{E}[q \sim P(Q), \{o_i\}_{i=1}^{G} \sim \pi_{\theta_{old}}(O|q)] \frac{1}{G} \sum_{i=1}^{G} \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} \left\{ \min \left[ \rho_{i,t} \hat{A}_{i,t}, \; \text{clip}(\rho_{i,t}, 1-\varepsilon, 1+\varepsilon) \hat{A}_{i,t} \right] - \beta \, \text{KL}[\pi_\theta \Vert \pi_{\text{ref}}] \right\}$$

其中 \\(\rho_{i,t} = \frac{\pi_\theta(o_{i,t} \mid q, o_{i,<t})}{\pi_{\theta_{old}}(o_{i,t} \mid q, o_{i,<t})}\\) 是重要性采样比率。

与 PPO 对比，可以看到 GRPO 的两处结构性变化：

### 3.3.1 变化一：多样本"组"采样与双层平均

PPO 对单个 prompt 生成**一条**回复，在 token 维度计算优势并更新；GRPO 则对同一个问题生成 \\(G\\) 条回复，形成一个"组"：

- **外层** \\(\frac{1}{G}\sum_{i=1}^{G}\\)：对 \\(G\\) 个回答求平均——这是 GRPO 特有的，PPO 中没有这一层；

- **内层** \\(\frac{1}{\vert o_i \vert}\sum_{t=1}^{\vert o_i \vert}\\)：对单条回答中的 token 求平均——这与 PPO 相同，做长度归一化。

多样本采样不仅是优势计算的基础（需要组内统计量），也会降低梯度估计方差：\\(G\\) 个样本的平均梯度通常比单样本梯度更稳定。

### 3.3.2 变化二：优势函数来源完全不同

|  | PPO | GRPO |
| --- | --- | --- |
| **优势来源** | Critic 网络 \\(V(s_t)\\) + GAE | 组内奖励标准化 |
| **所需额外模型** | Critic（与 Actor 同规模） | 无 |
| **粒度** | 逐 token（通过 TD Error 链式传播） | 结果监督：全序列统一；过程监督：逐步累积 |

其余结构，包括重要性采样比率 \\(\rho_{i,t}\\)、Clip 机制、KL 散度惩罚，与 PPO 保持一致。直觉上，GRPO 的优化方向是：

- 组内表现高于平均的回答（\\(\hat{A}_{i,t} > 0\\)）→ 整条序列的生成概率被**放大**；

- 组内表现低于平均的回答（\\(\hat{A}_{i,t} < 0\\)）→ 整条序列的生成概率被**压制**。

这样就可以在不依赖 Critic 网络的情况下做策略优化。下面看这个目标函数在训练循环中如何执行。

***

## 3.4 GRPO 训练流程

### 3.4.1 算法流程详解：三层嵌套循环

![](/images/从 PPO 到 DPO 再到 GRPO：大模型强化学习对齐技术全景解读/3.png)

GRPO 的训练由三层嵌套循环构成，每层负责不同的节奏：

**第一层：大周期（Iteration Loop）——** \\(T\\) **轮**

这是迭代式强化学习的宏观周期。每轮开始时执行两个操作：

- **更新参考模型**：将当前策略 \\(\pi_\theta\\) 复制为 \\(\pi_{\text{ref}}\\)。此后在整个大周期内， \\(\pi_{\text{ref}}\\) 保持冻结，用于计算 KL 散度惩罚；

- **更新 RM**（可选）：DeepSeekMath 中会边训练策略边优化奖励模型 \\(r_\phi\\)，让奖励模型随策略迭代更新。

**第二层：采样周期（Step Loop）——** \\(N\\) **步**

这是数据收集阶段，每步执行以下操作：

1. **抽题**：从题库中采样一批问题 \\(\mathcal{D}_b\\)；

2. **快照**：将当前 \\(\pi_\theta\\) 复制给 \\(\pi_{\theta_{\text{old}}}\\)，作为本轮采样的冻结副本；

3. **组采样**：用 \\(\pi_{\theta_{\text{old}}}\\) 对每个问题生成 \\(G\\) 个回答；

4. **打分与计算优势**：用 RM/PRM 打分，按 3.2 节的方法计算 \\(\hat{A}_{i,t}\\)；

5. **产出**：得到一批固定的训练数据——包含问题、回答、优势值、以及旧策略的概率 \\(\pi_{\theta_{\text{old}}}(o_{i,t} \mid q, o_{i,<t})\\)。

**第三层：学习周期（GRPO Loop）——** \\(\mu\\) **轮**

拿着第二层采好的固定数据，对策略模型进行 \\(\mu\\) 轮参数更新。数据会被切成 mini-batch，逐批计算 3.3 节的目标函数并执行梯度下降。

> **为什么要分三层？** 第一层控制"参考锚点的刷新频率"，第二层控制"数据采集与模型快照的节奏"，第三层控制"对同一批数据的复用程度"。这三个频率分开后，稳定性和数据效率可以分别调。

### 3.4.2 重要性采样比率（Ratio）为什么必不可少？

在第三层循环中，有一个必须处理的问题：**数据是用** \\(\pi_{\theta_{\text{old}}}\\) **生成的，但模型** \\(\pi_\theta\\) **在每次梯度更新后都会变化**。从第一个 mini-batch 更新后， \\(\pi_\theta\\) 就已经不等于 \\(\pi_{\theta_{\text{old}}}\\) 了；到第 \\(\mu\\) 轮结束时，两者可能相差很大。

重要性采样比率 \\(\rho_{i,t} = \frac{\pi_\theta(o_{i,t} \mid q, o_{i,<t})}{\pi_{\theta_{old}}(o_{i,t} \mid q, o_{i,<t})}\\) 正是为了修正这个"分布错位"：

| Ratio 取值 | 含义 | 对训练的影响 |
| --- | --- | --- |
| \\(\rho > 1\\) | 新策略比旧策略更倾向于生成这个 token | 若 \\(\hat{A} > 0\\)（好回答），放大梯度，强化该行为 |
| \\(\rho < 1\\) | 新策略认为这个 token 不太可能出现 | 降低该数据点的权重，减少其对更新的影响 |
| \\(\rho \approx 1\\) | 新旧策略一致 | 无修正，正常更新 |

Clip 机制在 Ratio 的基础上继续限制更新：将 \\(\rho_{i,t}\\) 截断在 \\([1{-}\varepsilon, 1{+}\varepsilon]\\) 范围内，防止单个 token 的梯度贡献过大，让策略更新尽量留在旧策略附近。

> **一句话总结**：Ratio 处理的是"用旧经验训练新模型"的分布不一致问题（off-policy correction），Clip 限制的是单次更新幅度。两者配合，支撑了同一批数据的多轮复用。这一机制与 PPO 相同，也是 GRPO 保留 RL 框架的地方。

## 3.5 三类算法对比总览

PPO、DPO、GRPO 可以看作三条不同路径：完整 RL、去 RL 化、以及轻量 RL。下表对比三者的设计选择与工程特性：

<br>

| 对比维度 | PPO（完整 RL 框架） | DPO（直接偏好优化） | GRPO（轻量 RL 框架） | 差异说明 |
| --- | --- | --- | --- | --- |
| **1. 训练流程** | 复杂的三阶段流程：1. 监督微调（SFT）→ 2. 训练奖励模型（RM）→ 3. PPO 强化学习微调 | 简化的两阶段流程：1. 监督微调（SFT）→ 2. DPO 直接优化 | 与 PPO 相同的三阶段流程，但第三阶段不再训练 Critic | DPO 省去独立 RM 训练阶段；GRPO 保留 RM，但简化 RL 内部流程 |
| **2. 奖励机制** | **显式奖励模型**：需训练独立的 RM 神经网络，对生成文本打分。RM 是真实奖励的代理（Proxy） | **隐式奖励模型**：不需要独立 RM，奖励通过 \\(r \propto \log(\pi_\theta / \pi_{\text{ref}})\\) 被解析地、隐式地定义在策略模型本身中 | **显式奖励模型**：与 PPO 相同需要独立 RM；支持结果监督（ORM）和过程监督（PRM）两种打分粒度 | DPO 将奖励和策略联动，减少 RM 与策略之间的不一致性（mismatch），但也失去了独立评估回复质量的能力 |
| **3. 优化算法** | **Actor-Critic 架构**：需同时维护策略网络（Actor）和价值网络（Critic），通过 GAE 计算优势函数，梯度方差较大 | **分类损失函数**：将问题转化为偏好对上的二元交叉熵损失，本质是监督学习问题，可直接通过梯度下降优化 | **Group Relative 架构**：只保留 Actor，去掉 Critic，用组内奖励标准化替代 GAE 来估计优势函数 | GRPO 介于 PPO 和 DPO 之间：保留 RL 的策略梯度框架，但用统计方法替代 Critic |
| **4. 训练采样** | **在线采样**：需要在训练循环中不断从当前策略中采样生成回答，再用 RM 打分、计算优势值，是主要的计算瓶颈 | **无需在线采样**：训练完全基于静态的、离线的偏好数据集 \\((x, y_w, y_l)\\) 进行，与标准监督学习流程一致 | **在线组采样**：对同一问题从旧策略采样 \\(G\\) 个回答（如 16/64 个），组内比较后构造优势信号 | DPO 降低训练阶段计算需求；GRPO 仍需在线采样，但多样本平均可以降低梯度方差 |
| **5. 所需模型** | **4 个模型**：Actor + Critic + RM + Reference，显存占用高 | **2 个模型**：Policy + Reference，显存需求最低 | **3 个模型**：Actor + RM + Reference（无 Critic），显存介于两者之间 | 对于 70B 参数量的模型，去掉 Critic 可节省约 30-50% 的显存开销 |
| **6. 超参调优** | **超参多且敏感**：Actor/Critic 学习率、GAE 的 \\(\lambda\\)、clip 的 \\(\varepsilon\\)、KL 惩罚系数 \\(\beta\\) 等，调参难度高 | **超参较少**：核心超参主要是 \\(\beta\\)（控制 KL 约束强度） | **超参适中**：继承 PPO 的 clip \\(\varepsilon\\) 和 KL 系数 \\(\beta\\)，新增组大小 \\(G\\)，但省去了 Critic 相关超参 | DPO 的调参面更小；GRPO 的 \\(G\\) 选择会明显影响训练效果 |
| **7. KL 约束** | **显式惩罚项**：在目标函数中直接添加 \\(\beta \cdot \text{KL}[\pi_\theta \Vert \pi_{\text{ref}}]\\) | **隐式约束**：KL 惩罚被放进损失函数结构中，通过 \\(\log(\pi_\theta/\pi_{\text{ref}})\\) 体现 | **显式惩罚项**：与 PPO 相同，在目标函数中直接计算 KL 散度 | DPO 的 \\(\beta\\) 基本承担稳定性旋钮的作用，因此调参仍然关键 |
| **8. 稳定性与实现复杂度** | 实现复杂，训练不稳定：涉及多组件协同（RM 质量传导误差、Critic 估值偏差、on-policy 采样方差），RL 训练本身也容易不稳定 | 实现简单，训练更接近监督学习：损失函数实现只需几行代码 | 实现中等：保留 PPO 的采样和 clip 机制，但去掉 Critic 后少了一个主要不稳定源 | GRPO 的组内标准化提供了低方差优势估计，但也会损失一部分 token 级精细度 |
| **9. 适用场景** | 通用 RLHF：适合需要精细奖励信号和在线探索的场景 | 有偏好数据时的快速对齐：适合离线数据充足、追求训练效率的场景 | 可验证奖励的推理任务：特别适合数学、代码等有明确正误判定的场景 | 三者并非替代关系，而是适配不同的资源条件和任务特性 |
| **10. 代表应用** | InstructGPT, ChatGPT | Llama 2, Zephyr | DeepSeekMath, DeepSeek-R1 | — |

<br>

# 4 延伸阅读

若你对本文涉及的 PPO、DPO、GRPO 及大模型对齐技术感兴趣，以下资源值得深入阅读：

**原始论文**

- [Proximal Policy Optimization Algorithms (Schulman et al., 2017)](https://arxiv.org/abs/1707.06347) —— PPO 的原始论文，提出了 Clip 机制替代 TRPO 的二阶约束，奠定了现代策略梯度方法的工程基础。

- [Training language models to follow instructions with human feedback (Ouyang et al., 2022)](https://arxiv.org/abs/2203.02155) —— InstructGPT 论文，首次将 PPO 应用于 LLM 的 RLHF 对齐流程，定义了 SFT → RM → PPO 的经典三阶段范式。

- [Direct Preference Optimization: Your Language Model is Secretly a Reward Model (Rafailov et al., 2023)](https://arxiv.org/abs/2305.18290) —— DPO 原始论文，推导了从 KL 约束最优策略到偏好分类损失的完整数学链条，展示了绕过 RL 的可行性。

- [DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (Shao et al., 2024)](https://arxiv.org/abs/2402.03300) —— GRPO 的提出论文，在数学推理任务上验证了用组内相对比较替代 Critic 网络的有效性。

- [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning (DeepSeek-AI, 2025)](https://arxiv.org/abs/2501.12948) —— DeepSeek-R1 技术报告，展示了 GRPO 在大规模推理模型训练中的工程实践与效果。

**进一步阅读**

- [A General Theoretical Paradigm to Understand Learning from Human Feedback (Azar et al., 2023)](https://arxiv.org/abs/2310.12036) —— 提出 IPO（Identity Preference Optimization），从理论上修正了 DPO 在有限偏好数据下的过拟合问题。

- [Self-Play Fine-Tuning Converts Weak Language Models to Strong Language Models (Chen et al., 2024)](https://arxiv.org/abs/2401.01335) —— SPIN 方法，探索了无需人类偏好标注、通过自博弈实现对齐的新路径。

- [RLHF Workflow: From Reward Modeling to Online RLHF (Dong et al., 2024)](https://arxiv.org/abs/2405.07863) —— 梳理了从离线 DPO 到在线 RLHF 的工程流程。

- [Is DPO Superior to PPO for LLM Alignment? A Comprehensive Study (Xu et al., 2024)](https://arxiv.org/abs/2404.10719) —— 对 PPO 与 DPO 在多个基准上的系统对比实验，揭示了两者在不同任务类型下的互补优势。

<br>

*本文为个人论文阅读笔记整理，如有疏漏欢迎指正。*

