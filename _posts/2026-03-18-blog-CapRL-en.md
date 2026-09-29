---
title: 'CapRL: Improving Vision-Language Model Captioning with Reinforcement Learning'
date: 2026-03-18
reading_time: "30 minutes read"
permalink: /posts/en/2026/03/CapRL/
lang: en
translation_key: caprl
view_key: posts-2026-03-caprl
tags:
  - VLM
  - RL
---

> **Paper**: [CapRL: Stimulating Dense Image Caption Capabilities via Reinforcement Learning](https://arxiv.org/pdf/2509.22647) (CVPR 2025)
> **Authors**: Xing et al.
> **TL;DR**: CapRL turns caption quality into a verifiable question: if a caption is complete enough, a text-only LLM should be able to answer image-related multiple-choice questions from that caption alone. This setup avoids the length and style preferences of LVLM-as-a-Judge and gives RL training a more stable reward signal.

***

# 1. Introduction: defining a reward for image captioning

Image captioning looks like a straightforward generation task: given an image, produce text. The hard part is the evaluation standard. What counts as a good caption? Naming the main subject is not enough, while piling on details can introduce errors. For dense captioning, the goal is closer to conveying as much visual information as possible without hallucinating.

CapRL addresses this problem. It trains a VLM to produce captions that carry more information and remain factually reliable, then expresses that objective in a reinforcement learning framework.

The conventional approach starts with SFT, teaching the model to imitate human-written captions. This creates several clear problems.

![](/images/CapRL/0.png)

![](/images/CapRL/1.png)

- Annotation is expensive. A high-quality dense caption requires a person to inspect many details, which is costly at scale.
- Coverage is limited. Models readily learn common caption templates from the training set, but their coverage of details within the same image remains inconsistent.
- Evaluation is subjective. Text-overlap metrics such as BLEU and ROUGE struggle to tell whether a caption is genuinely complete and accurate.

RL is a natural option: let the model explore different captions and use a reward function to select better outputs. The difficulty then moves to the reward itself. Image captioning is not a math problem. If the reward still depends on a model's subjective score, training can learn the evaluator's preferences instead of learning to write better captions.

***

# 2. The problem with existing RL methods: reward hacking

A common approach uses another LVLM as a judge, scoring a caption against its image. The judge brings its own preferences. A general-purpose LVLM may favor longer, more detailed answers, while some reward models prefer short, clean outputs. Once the policy model discovers those preferences, it can score well without describing the image faithfully.

![](/images/CapRL/2.png)

## 2.1 Bias in the judge

An LVLM-as-a-Judge reward is more than a factual check. It compresses content coverage, writing style, length, and organization into one score. When that score becomes an RL reward, the model optimizes the features that the judge detects most easily.

The paper discusses two common biases:

- General-purpose LVLMs may favor verbose descriptions.
- General-purpose reward models may favor concise outputs.

## 2.2 How the policy exploits those biases

The policy model can exploit either preference. With a judge that rewards verbosity, it may produce a long, well-structured passage that says little about the image:

```text
# A judge that favors verbosity
Output: "My description is well organized and carefully structured. First, I should explain..."
Result: a high score without describing the image

# A judge that favors brevity
Output: "There are three animals in the image."
Result: a high score with very little information
```

This is reward hacking: the reward improves while the target task does not. In more severe cases, training collapses. Caption length may suddenly balloon or shrink until almost no information remains. CapRL starts by replacing this subjective score with a reward that can be checked more directly.

***

# 3. CapRL's reward design

CapRL defines a good caption as follows:

> A high-quality caption should allow a text-only LLM that cannot see the image to answer questions about it from the caption alone.

This definition replaces "Is this caption good?" with "Can the questions be answered correctly?" It has four direct consequences:

1. The reward is verifiable. An MCQ answer can be marked right or wrong.
2. Stock phrasing earns little credit. Long, irrelevant text does not contain the answer.
3. The reward favors information coverage. A caption that includes more visual details can support more questions.
4. Custom QA questions can direct the model toward particular visual information, such as color, count, or spatial relations, producing captions suited to different downstream tasks.

![](/images/CapRL/3.png)

## (a) Subjective caption reward: problem setup

The left side of the figure shows the conventional subjective reward pipeline. After the policy model generates a caption, an LVLM-as-a-Judge receives both the image and the caption, then returns a single score for RL.

The problem is not that the judge cannot produce a score. It is that the score has no single, clean meaning. The judge may reward stylistic properties such as detail, brevity, or clear structure. The policy then optimizes those preferences. In the paper's examples, a policy facing a verbosity-biased judge produces "Lengthy Irrelevant" text, while one trained against a brevity-biased reward model produces a "Brief Incomplete" description.

## (b) Objective caption reward: CapRL's approach

CapRL computes its reward through decoupled VQA. The policy model first generates a caption from the image. A text-only LLM that cannot see the image then reads the caption and the image's MCQs and attempts to answer them. More correct answers produce a higher caption reward.

The important constraint is that the evaluator is vision-free. It cannot bypass the caption and answer from the original image. If the caption omits color, count, spatial relations, visible text, or other required details, the LLM loses credit on the corresponding questions.

## (c) Training curves and caption quality: experimental results

The reward curve on the left and the caption-length curve in the middle mainly show training stability.

- The blue curve uses Qwen2.5-VL-3B as a judge. Its reward quickly reaches 1.0 while caption length rises sharply, matching the pattern of attacking the reward with verbose output.
- The orange curve uses a Unified Reward Model as a judge. Training collapses after the reward rises, and caption length falls close to zero.
- The red curve is CapRL. Its reward changes more smoothly, without an extreme increase or collapse in caption length.

The radar chart on the right reports performance under the Prism Framework, including benchmarks such as ChartQA, MathVerse, and SEED. In the paper's figure, CapRL's red line outperforms the original model and both judge-based training methods on most dimensions. A careful reading is that the verifiable reward reduces obvious reward hacking without sacrificing performance on downstream multimodal tasks.

# 4. Building a high-quality MCQ dataset

CapRL depends on the quality of its MCQs. If a question can be answered without the image, a poor caption may still earn credit. If the image does not support the answer, the reward becomes noise. The paper therefore constructs image-related MCQs and filters out information leakage before training.

## 4.1 Stage one: collecting images

Images come from open datasets such as ShareGPT4V-1M and DenseFusion-1M, along with web-collected natural photographs, documents, charts, and user interfaces.

Quality and safety filters remove low-resolution, overly simple, violent, and sexual content. The researchers also remove images that closely resemble common evaluation benchmarks to reduce the risk of benchmark leakage.

## 4.2 Stage two: generating question-answer pairs

For each image, Qwen2.5-VL-72B generates several MCQs about its contents and supplies the correct answers.

![](/images/CapRL/4.png)

## 4.3 Stage three: filtering question-answer pairs

The filtering stage removes information leakage, leaving questions that genuinely depend on visual evidence.

Information leakage occurs when a question does not require the image. Suppose an image contains an "Eiffel Tower" sign and the question asks, "What is the capital of France?" A model can answer "Paris" from general knowledge. Such a question cannot evaluate caption quality.

The paper uses two checks in opposite directions:

1. Positive verification: give the LVLM the image and the question and require a correct answer. To reduce cost, the paper uses Qwen2.5-VL-3B during filtering. This condition confirms that the question concerns visible content and that the answer can be recovered from the image.
2. Negative verification: give the same LVLM only the question, without the image, and require an incorrect answer. This condition removes questions that can be solved through language cues or general knowledge alone.

A question-answer pair `(q, a)` is retained only when it passes both checks.

The paper expresses the filter as follows:

![](/images/CapRL/5.png)

- `Q` is the final filtered dataset.
- `(q, a)` is a question-answer pair.
- `D` is the initial generated dataset.
- `Mv(q, I) = a` means that the model answers `a` correctly when it sees image `I` and question `q`.
- `Mv(q) ≠ a` means that the model fails to answer `a` when it sees question `q` alone.

# 5. Method

CapRL training has two steps. An LVLM generates a caption, then a vision-free LLM answers questions from that caption to produce a reward. This separation bases the reward on how well the caption supports QA instead of a judge's overall impression of the prose.

![](/images/CapRL/6.png)

## 5.1 Stage one: the LVLM generates an image caption

The policy is the LVLM being trained, Qwen2.5-VL-3B in the paper. It receives an image and a captioning instruction such as "Describe this image in detail," then generates a candidate caption.

## 5.2 Stage two: a vision-free LLM answers questions

The candidate caption and its image-related MCQs are passed to an independent text-only model, Qwen2.5-3B-Instruct. This model has no access to the image and must rely on the caption to answer each question.

![](/images/CapRL/7.png)

## 5.3 Computing the reward

The text-only LLM answers each question from the caption. A correct answer scores 1 and an incorrect answer scores 0. The mean accuracy over all questions becomes the reward for that caption.

For a generated caption $c$ and question set $\{q_1, q_2, ..., q_n\}$:

$$
R(c) = \frac{1}{n}\sum_{i=1}^{n}\mathbb{1}\left[\text{LLM}(c, q_i) = a_i\right]
$$

where:

- $c$ is the generated image caption.
- $q_1, q_2, ..., q_n$ is its question set.
- $a_i$ is the correct answer to the $i$-th question.
- $\mathbb{1}[\cdot]$ is an indicator function that returns 1 when the condition is true and 0 otherwise.

The reward directly measures whether the caption contains the information needed to answer the questions. If it describes object counts, spatial relations, chart content, or visible text more accurately, the vision-free LLM answers more questions correctly.

## 5.4 Model optimization and training

After computing the reward, CapRL uses GRPO to update the LVLM from stage one. The model repeatedly generates captions, receives feedback through the stage-two reward, and updates its parameters.

The full loop is:

```text
generate a caption -> evaluate it objectively -> receive a reward -> update the model -> generate a new caption
```

# 6. What does CapRL solve?

CapRL addresses four concrete problems.

First, it reduces SFT's dependence on fixed annotations. SFT can only learn the distribution of captions already in its data, while RL lets the model explore different descriptions. The method still carries data costs: generating and filtering MCQs requires high-quality images, a strong VLM, and additional inference.

Second, it turns subjective caption evaluation into a verifiable reward. QA accuracy is not a perfect caption metric, but it is easier to analyze than an opaque judge score and harder to exploit with irrelevant stock text.

Third, it places information density and accuracy in the same reward framework. A high-scoring caption must contain visual evidence that supports the answers. In Figure 2, the CapRL-trained model covers charts and complex scenes more fully, with a structure that more closely resembles an intermediate representation for QA.

Fourth, it provides a scalable training pipeline. Image collection, MCQ generation, bidirectional verification, and RL optimization can all be automated. Scaling does not make the method cheap. The bottleneck shifts to question quality, the filtering model's ability, and the extra inference required during training.

# 7. Further analysis

## 7.1 Why does CapRL work?

CapRL works because its reward matches the function of a caption more closely. Image captioning compresses visual information into text. A conventional judge asks whether the writing is good, mixing style, length, completeness, and accuracy. CapRL asks whether the text supports answers to questions about the image. That narrower objective makes a cleaner reward.

Open-ended generation is hard to evaluate directly, while closed-form verification is easier. An MCQ answer is right or wrong, so its reward signal is clearer than a subjective score. The tradeoff is coverage: the reward only sees the visual information represented in the question set. Details that no question asks about do not enter the optimization objective.

The separation between models also matters. Once the captioning LVLM and the text-only answering model are decoupled, generic visual phrasing cannot fool an evaluator that has no access to the image. The evaluator must find evidence in the caption, bringing the reward closer to a direct test of whether the visual information was written down.

## 7.2 A broader pattern

CapRL suggests a general strategy: when quality is hard to assess directly, define the quality of an upstream artifact through its performance on a downstream task.

| Task | Analogous test |
| :-- | :-- |
| Document summarization | A good summary should support answers to questions about the source document |
| Knowledge graph construction | A good knowledge graph should support multi-hop queries |
| Code documentation | Good documentation should help developers use an API correctly |
| Data annotation | Good labels should support accurate predictions by a downstream model |

This approach fits tasks where the generated artifact is difficult to score but its function can be tested. The proxy task must remain close to the original objective. Otherwise, the model optimizes the proxy instead of the quality that matters.

## 7.3 Limitations and open questions

MCQ coverage determines what the model learns. If the questions favor object recognition, the model may focus on categories, counts, and positions while overlooking atmosphere, narrative relations, or fine-grained style. The question-generation strategy becomes a new inductive bias.

Caption quality is also broader than QA accuracy. Readability, logical organization, redundancy, and fluency matter, yet MCQs may not capture them fully. A later reward design may need to constrain factual coverage and writing quality together.

The evaluator LLM sets another ceiling. If the text-only model has weak reasoning or inconsistent instruction following, the reward becomes noisy. If it can guess from patterns in the answer choices, the reward is contaminated. Positive and negative verification reduce these problems without eliminating them.

The compute cost is also substantial. Every caption triggers inference over several MCQs, making training more expensive than ordinary SFT. In practice, question count, evaluator size, and reward stability have to be balanced.

***

# 8. Conclusion

CapRL's main idea lies in its reward. Instead of asking an LVLM judge for a subjective caption score, it uses the caption as intermediate evidence and tests whether a text-only LLM can answer image-related questions from that evidence alone.

## 8.1 Main contributions

1. A verifiable caption reward: MCQ accuracy replaces subjective scoring, reducing the risk of reward hacking.
2. An MCQ filtering procedure: the "correct with the image, incorrect without it" checks reduce leakage from general knowledge and language cues.
3. GRPO training for VLMs: the model learns through RL to generate dense captions that better support QA.

## 8.2 Broader implications

The idea extends beyond image captioning. It offers a concrete pattern for RL reward design: before asking a model or a person to score open-ended text directly, look for a verifiable proxy task.

> When subjective quality is hard to measure directly, find a verifiable proxy and optimize for a function that can be checked.

This principle follows the logic of RLVR. Math problems come with naturally verifiable rewards, while captioning requires the verification questions to be constructed. That is CapRL's main contribution: it gives image captioning a relatively clear reward interface and makes the limits of that interface visible.

***

# 9. Further reading

For more on RLHF and reward-model design:

- **RLAIF**: [Constitutional AI](https://arxiv.org/abs/2212.08073), Anthropic 2023, replaces human feedback with AI feedback.

- **RLVR**: [DeepSeek-R1](https://arxiv.org/abs/2501.12948), reinforcement learning with verifiable rewards.

- **Self-Rewarding LM**: [Meta 2024](https://arxiv.org/abs/2401.10020), trains a model to judge its own outputs for iterative improvement.


*These are my personal notes on the paper. Corrections are welcome.*
