---
title: 'The Evolution of Positional Encoding: From Absolute and Relative Positions to Multimodal RoPE'
date: 2026-05-15
permalink: /posts/en/2026/05/positional-encoding/
lang: en
translation_key: positional-encoding
view_key: posts-2026-05-positional-encoding
reading_time: "30 minutes read"
tags:
  - Positional Encoding
  - LLM
  - VLM
---

> **TL;DR:** This article follows the main line of positional encoding research: the limitations of learned absolute embeddings in [BERT](https://arxiv.org/abs/1810.04805) and [GPT](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf), sinusoidal encoding in the original [Transformer](https://arxiv.org/abs/1706.03762), the improvements introduced by [relative positional encoding](https://arxiv.org/abs/1803.02155) in models such as [T5](https://arxiv.org/abs/1910.10683) and [Transformer-XL](https://arxiv.org/abs/1901.02860), and finally [Rotary Positional Encoding (RoPE)](https://arxiv.org/abs/2104.09864). RoPE applies an absolute rotation at each position, yet the resulting attention inner product depends only on relative distance. Later extensions, including 2D-RoPE and M-RoPE, carry the same mechanism into vision and multimodal models such as [Qwen2-VL](https://arxiv.org/abs/2409.12191) and [Qwen3-VL](https://arxiv.org/abs/2511.21631). The question throughout is how a model represents distance while preserving length extrapolation, KV caching, and multimodal coordinates.

---

# 1. Introduction

Transformer self-attention computes pairwise inner products between tokens in a sequence ($\boldsymbol{q}_{m}^{\top} \boldsymbol{k}_{n}$). Without additional positional information, this operation is permutation invariant: rearranging the same tokens does not tell attention which token came first. Positional encoding supplies that missing information so that the inner product can depend on the relationship between token positions.

"Black Cat" and "Cat Black," for example, contain the same tokens in a different order. Word embeddings alone cannot distinguish them. The sections below move from absolute and relative positional encoding to RoPE and multimodal RoPE, focusing on what each step fixes and what new constraints it introduces.

# 2. Absolute positional encoding

**Main idea:** encode each token's absolute position as a vector and add it to the token's word embedding.

## 2.1. Learned positional encoding

The most intuitive method assigns a unique vector to every absolute position from $0$ to the maximum sequence length $L_{max}$. These vectors are randomly initialized and trained as model parameters.

- **Advantage:** the implementation is simple, and the model can fit the positional representation to its training data.

- **Limitations:**
  - **No extrapolation:** if the maximum training length is 2048, position 2049 has no learned parameter to retrieve. Inference fails once the lookup table runs out.

  - **No translation invariance:** the same phrase, such as "Black Cat," receives completely different position vectors at the beginning and end of a sequence. The model has to relearn the same local relationship at different positions.

  - **High parameter cost:** long contexts require a large table of position vectors.

- **Representative models:** BERT, GPT, and some later Transformers.

## 2.2. Sinusoidal positional encoding

The original *Attention Is All You Need* paper replaces learned parameters with fixed sine and cosine functions. For position $pos$ and dimension $i$, the encoding $PE_{(pos, i)}$ is:

$$PE_{(pos, 2i)} = \sin(pos / 10000^{2i/d_{model}})$$

$$PE_{(pos, 2i+1)} = \cos(pos / 10000^{2i/d_{model}})$$

- **Advantages:**
  - **Theoretical extrapolation:** an analytic function has no fixed maximum position.

  - **No parameter overhead:** the encoding is computed entirely from a formula.

  - **Implicit relative information:** trigonometric addition identities allow the encoding at $pos+\delta$ to be expressed as a linear transformation of the encoding at $pos$, helping self-attention learn relative positions.

- **Limitation:** adding the vector to the embedding still makes precise relative distances difficult to recover. At very long sequence lengths, the method also does little to suppress noise from distant tokens.

***

# 3. Relative positional encoding

Local structure and relative distance often matter more in language than absolute coordinates. Relative positional encoding (RPE) models those distances directly.

- **Main idea:** leave the embedding unchanged and add a bias based on relative distance $(j-i)$ when computing the attention score.

- **Mechanism:** for an attention score $e_{ij} = q_{i} \cdot k_{j}$, include the position of $j$ relative to $i$. One form is $e_{ij} = q_{i} \cdot (k_{j} + r_{j-i})$, where $r_{j-i}$ encodes the relative distance.

- **Advantages:**
  - **Direct relative modeling:** the position term enters the attention score, so the model sees a distance rather than two independent absolute coordinates.

  - **Extrapolation:** the model can generalize to unseen relative distances. Implementations often clip the range from `-K` to `K` and share encodings outside it.

  - **Little parameter overhead:** relative-distance encodings are usually shared or generated by a function.

- **Main drawback: inefficient KV-cache inference.**
  - **Reason:** relative distance changes dynamically. When token $t$ is generated, the first cached token is $t-1$ positions away. At token $t+1$, that distance becomes $t$. Each new token therefore requires the relative-position bias for all historical tokens to be looked up again. Cached keys and values cannot be reused as a plain matrix multiplication.

- **Representative models:** Transformer-XL and T5.

***

# 4. Rotary positional encoding (RoPE)

## 4.1. Main idea

The earlier methods fall into two broad groups:

- **Absolute positional encoding (APE):** add a fixed vector at each position, as in sinusoidal or learned embeddings. This is simple but does not model relative distance explicitly.

- **Relative positional encoding (RPE):** inject a relative-distance bias into attention, as in T5. This expresses distance directly but makes KV-cache reuse less efficient.

RoPE uses rotations indexed by absolute position to produce inner products that depend on relative position. Each position receives its own rotation, so the operation looks absolute. After the query and key are multiplied, however, the result depends only on the distance between their positions.

## 4.2. 1D-RoPE

### 4.2.1. Derivation

**Step 1: the complex-number view in two dimensions**

Consider a two-dimensional vector $\boldsymbol{q} = (q_{0}, q_{1})$. Treat it as the complex number $\boldsymbol{q} = q_{0} + \mathrm{i} q_{1}$. Applying RoPE at position $m$ is equivalent to multiplying by a unit complex rotation:

$$f(\boldsymbol{q}, m) = \boldsymbol{q} e^{\mathrm{i} m\theta} = \|\boldsymbol{q}\| e^{\mathrm{i}(\Theta(\boldsymbol{q}) + m\theta)}$$

Geometrically, this rotates $\boldsymbol{q}$ by $m\theta$ in the plane. Its magnitude $\|\boldsymbol{q}\|$ remains unchanged while its direction gains an angle of $m\theta$. This is where rotary positional encoding gets its name.

In matrix form, the operation is a standard two-dimensional rotation:

$$f(\boldsymbol{q}, m) = \begin{pmatrix} \cos m\theta & -\sin m\theta \\ \sin m\theta & \cos m\theta \end{pmatrix} \begin{pmatrix} q_{0} \\ q_{1} \end{pmatrix}$$

---

**Step 2: extending to higher dimensions with block-diagonal rotations**

Query and key vectors in a Transformer have dimension $d$ far greater than 2, commonly 64 or 128. Because inner products are linear sums, RoPE in any even dimension can be written as $d/2$ separate two-dimensional rotations.

Group the vector components in pairs $(q_{0},q_{1}),(q_{2},q_{3}),\ldots,(q_{d-2},q_{d-1})$. Rotate every pair independently at a different frequency to obtain the block-diagonal matrix $\mathcal{R}_{m}$:

$$\underbrace{\begin{pmatrix} \cos m\theta_{0} & -\sin m\theta_{0} & 0 & 0 & \cdots & 0 & 0 \\ \sin m\theta_{0} & \cos m\theta_{0} & 0 & 0 & \cdots & 0 & 0 \\ 0 & 0 & \cos m\theta_{1} & -\sin m\theta_{1} & \cdots & 0 & 0 \\ 0 & 0 & \sin m\theta_{1} & \cos m\theta_{1} & \cdots & 0 & 0 \\ \vdots & \vdots & \vdots & \vdots & \ddots & \vdots & \vdots \\ 0 & 0 & 0 & 0 & \cdots & \cos m\theta_{d/2-1} & -\sin m\theta_{d/2-1} \\ 0 & 0 & 0 & 0 & \cdots & \sin m\theta_{d/2-1} & \cos m\theta_{d/2-1} \end{pmatrix}}_{\mathcal{R}_{m}} \begin{pmatrix} q_{0} \\ q_{1} \\ q_{2} \\ q_{3} \\ \vdots \\ q_{d-2} \\ q_{d-1} \end{pmatrix}$$

Here, $q$ is the full query vector for one token.

Each pair uses a different frequency $\theta_i$:

$$\theta_{i} = 10000^{-2i/d}, \quad i = 0, 1, \dots, d/2-1$$

Many later RoPE variants adjust one or both of these variables:

- **Token position** $m$: as $m$ grows, the rotation angle grows.

- **Component index** $i$: as $i$ grows, the angle and rotation frequency decrease.
  - Lower dimensions with small $i$ have large $\theta_i$, rotate quickly, and capture **high-frequency or short-range** relationships.
  - Higher dimensions with large $i$ have small $\theta_i$, rotate slowly, and capture **low-frequency or long-range** relationships.

This frequency spectrum assigns a different positional scale to each part of the vector. Lower dimensions respond more quickly, while higher dimensions change more slowly.

---

**Step 3: the identity that makes the result relative**

Multiply the query at position $m$ by $\mathcal{R}_{m}$ and the key at position $n$ by $\mathcal{R}_{n}$, then compute attention from the transformed vectors. Relative position follows from this identity:

$$(\mathcal{R}_{m} \boldsymbol{q})^{\top} (\mathcal{R}_{n} \boldsymbol{k}) = \boldsymbol{q}^{\top} \mathcal{R}_{m}^{\top} \mathcal{R}_{n} \boldsymbol{k} = \boldsymbol{q}^{\top} \mathcal{R}_{n-m} \boldsymbol{k}$$

The identity $\mathcal{R}_{m}^{\top} \mathcal{R}_{n} = \mathcal{R}_{n-m}$ holds because the transpose of an orthogonal rotation matrix is its inverse, and composing rotations adds their angles. Therefore:

> The final inner product depends only on the relative position $(n-m)$, not on the absolute positions $m$ and $n$.

This is the mathematical mechanism behind RoPE's absolute operation and relative effect.

### 4.2.2. Efficient implementation through sparsity

$\mathcal{R}_{m}$ is orthogonal and preserves vector magnitude, so it generally does not disturb the model's numerical scale.

The matrix is also sparse: most entries are zero. A full matrix multiplication would waste computation, so implementations rewrite the rotation as element-wise products:

$$\begin{pmatrix} q_{0} \\ q_{1} \\ q_{2} \\ q_{3} \\ \vdots \\ q_{d-2} \\ q_{d-1} \end{pmatrix} \otimes \begin{pmatrix} \cos m\theta_{0} \\ \cos m\theta_{0} \\ \cos m\theta_{1} \\ \cos m\theta_{1} \\ \vdots \\ \cos m\theta_{d/2-1} \\ \cos m\theta_{d/2-1} \end{pmatrix} + \begin{pmatrix} -q_{1} \\ q_{0} \\ -q_{3} \\ q_{2} \\ \vdots \\ -q_{d-1} \\ q_{d-2} \end{pmatrix} \otimes \begin{pmatrix} \sin m\theta_{0} \\ \sin m\theta_{0} \\ \sin m\theta_{1} \\ \sin m\theta_{1} \\ \vdots \\ \sin m\theta_{d/2-1} \\ \sin m\theta_{d/2-1} \end{pmatrix}$$

Here, ⊗ denotes element-wise multiplication, the `*` operation in frameworks such as NumPy and PyTorch. This form needs only two element-wise products and one addition, far less work than a full matrix multiplication.

The same expression also shows that RoPE is a multiplicative positional encoding. It writes position into each component by multiplication instead of adding a position vector, as sinusoidal APE does.

---

### 4.2.3. An intuitive picture

Imagine a clock face. Every token is a hand whose content determines its length and starting direction. Its position determines an additional rotation.

- Token 1 rotates by $1\theta$.

- Token 2 rotates by $2\theta$.

- Token $m$ rotates by $m\theta$.

The inner product between two tokens compares the angle between their hands. That angle depends on the difference $(n-m)\theta$, which is their relative distance, rather than either absolute position.

Each pair of vector components rotates at a different frequency $\theta_i$, like several hands moving at different speeds. Lower-dimensional components rotate quickly and respond to nearby changes. Higher-dimensional components rotate slowly and are better suited to long-range relationships.

**Visualization**

The figure below shows rotary positional encoding for six tokens: Enhanced, Transformer, with, Rotary, Position, and Embedding. Each token corresponds to a $d$-dimensional vector whose component pairs rotate independently.

![](/images/位置编码的发展历程：从绝对、相对到多模态旋转编码/0.png)

For each token, a component pair rotates by $m\theta_i$, with $\theta_i = 10000^{-2i/d}$:

- **As token position $m$ grows:** the rotation angle grows.
- **As component index $i$ grows:** the rotation angle and frequency decrease.

![](/images/位置编码的发展历程：从绝对、相对到多模态旋转编码/1.png)

### 4.2.4. Problems addressed by RoPE

#### Translation invariance

- **Applies to:** absolute positional encoding in models such as BERT and GPT-2.

- **Problem:** the same phrase, such as "Black Cat," receives entirely different positional vectors at the beginning and end of a sequence. The model must learn the same semantic relationship more than once.

- **RoPE's approach:** use the difference between rotation angles.

- **Reason:** whenever relative distance stays fixed, the angle difference $(n-m)$ in the inner product also stays fixed. The model learns a local relationship instead of a relationship tied to one coordinate.

#### Long-sequence extrapolation

- **Applies to:** learned positional embeddings.

- **Problem:** the maximum training length, such as 2048, limits inference. Positions beyond that length have no corresponding learned parameter.

- **RoPE's approach:** compute positions from a mathematical function.

- **Reason:** the rotation angle can still be computed when an index exceeds the maximum position seen during training. Being computable does not guarantee stability at arbitrary lengths. Real long-context performance still depends on training length, frequency scaling, and the extrapolation method.

#### Long-range decay and attention noise

- **Applies to:** standard attention.

- **Problem:** on very long text, the model does not naturally reduce attention to distant, irrelevant tokens.

- **RoPE's approach:** cancellation across multiple frequencies.

- **Reason:** when two tokens are far apart and $(n-m)$ is large, the dimensions rotate at different frequencies. Positive and negative terms are more likely to cancel in the summed inner product, naturally reducing the attention score and giving RoPE a degree of local bias.

#### KV-cache inference efficiency

- **Applies to:** relative positional encoding such as T5's.

- **Problem:** relative distances change whenever a token is generated. All distances from the current token to cached tokens must be looked up again and added as biases, preventing inference from using only cached keys and values in a matrix multiplication.

- **RoPE's approach:** write position directly into the vectors.

- **Reason:** each key is rotated before it enters the cache. At inference time, the current query can be multiplied directly by cached keys. The rotation identity recovers the relative positions without another lookup.

## 4.3. 2D-RoPE

### 4.3.1. Computation

2D-RoPE takes a feature tensor $X$ of shape $(B,L,D)$ and two sets of position indices. Height indices $P_h$ have shape $(B,L)$, for example `[0,0,0, 1,1,1...]`. Width indices $P_w$ have the same shape, for example `[0,1,2, 0,1,2...]`. A common implementation assigns half of the hidden dimension to height and half to width.

The calculation has three steps. First, split the features along the final dimension:

$$X_{height} = X[\ldots, 0 : D/2]$$

$$X_{width} = X[\ldots, D/2 : D]$$

Apply 1D-RoPE separately to the two subspaces:

$$X'_{height} = \text{RoPE}(X_{height}, P_h)$$

$$X'_{width} = \text{RoPE}(X_{width}, P_w)$$

Finally, concatenate them along the hidden dimension:

$$X_{out} = \text{Concat}(X'_{height}, X'_{width}, \text{dim}=-1)$$

$X_{out}$ still has shape $(B,L,D)$. Its first half encodes vertical position and its second half encodes horizontal position.

### 4.3.2. Problems addressed by 2D-RoPE

2D-RoPE deals with two problems created by dynamic-resolution images.

#### Problem 1: flattening destroys two-dimensional adjacency

Conventional methods flatten an image into a sequence one row at a time. On a two-dimensional grid, $(0,0)$ and $(1,0)$ are vertical neighbors. If the image is 100 pixels wide, their flattened indices are 0 and 100. A 1D positional encoding treats them as 100 positions apart and weakens their spatial adjacency.

2D-RoPE splits the vector into $h$ and $w$ components. Regardless of the flattening order, vertical neighbors differ by $\theta_0$ in the $h$ subspace and by 0 in the $w$ subspace. Geometry remains in coordinate differences instead of being represented indirectly by a flattened index.

#### Problem 2: dynamic resolution changes relative positions

Models such as Qwen2-VL must process images of different sizes and aspect ratios. In a $200 \times 200$ input, vertical neighbors differ by 200 in a flattened sequence. In a $400 \times 400$ input, the same neighbor relation produces a difference of 400. With 1D-RoPE, the model must learn that both gaps mean "adjacent," which does not generalize cleanly across resolutions.

2D-RoPE uses grid coordinates $(h,w)$ directly. At any image size, vertical neighbors have $\Delta h=1$ and $\Delta w=0$. The position signal follows the image geometry and is better suited to dynamic-resolution inputs.

## 4.4. M-RoPE

![](/images/位置编码的发展历程：从绝对、相对到多模态旋转编码/2.png)

### 4.4.1. Computation

M-RoPE extends 2D-RoPE into three dimensions. The input tensor $X$ has shape $(B,L,D)$, and the position indices now come in three sets: time $P_t$, height $P_h$, and width $P_w$, each with shape $(B,L)$. Video tokens use frame numbers and spatial coordinates. An image can hold the time coordinate constant, while text can map onto a one-dimensional sequence.

First, split the hidden dimension into three parts:

$$X_t = X[\ldots, 0 : D_t]$$

$$X_h = X[\ldots, D_t : D_t + D_h]$$

$$X_w = X[\ldots, D_t + D_h : D]$$

Apply 1D-RoPE to each part:

$$X'_t = \text{RoPE}(X_t, P_t)$$

$$X'_h = \text{RoPE}(X_h, P_h)$$

$$X'_w = \text{RoPE}(X_w, P_w)$$

Then concatenate the results:

$$X_{out} = \text{Concat}(X'_t, X'_h, X'_w, \text{dim}=-1)$$

The output remains $(B,L,D)$. During attention, temporal differences appear mainly in $X'_t$, while spatial differences appear mainly in $X'_h$ and $X'_w$.

### 4.4.2. Problems addressed by M-RoPE

M-RoPE uses one positional mechanism for mixed text, image, and long-video inputs.

#### Problem 1: incompatible dimensions across modalities

Text is one-dimensional, images are two-dimensional, and video is three-dimensional. Giving each modality a separate position encoding requires cross-modal attention to align different coordinate systems. Flattening everything into one dimension instead mixes the spatial and temporal structure of images and video into a single long index.

M-RoPE uses unified $(t,h,w)$ coordinates. Text can represent its sequence as $(i,i,i)$, images can use $(1,h,w)$ for a two-dimensional grid, and video uses $(t,h,w)$ for space and time. The positional meaning remains comparable when all modalities enter the same embedding space.

#### Problem 2: exploding indices and failed extrapolation in long videos

Video produces many tokens. A 1,000-frame video with 256 tokens per frame contains 256,000 tokens. A 1D position index grows past 250,000. If inference positions extend far beyond the training range, perhaps 32k, the distribution of $\cos(m\theta)$ angles departs sharply from what the model saw during training, and performance can fall.

M-RoPE splits one large index into three much smaller coordinates. The sequence may contain 250,000 tokens, while $t$ reaches only 1,000 and both $h$ and $w$ reach only 16. Each coordinate remains closer to the positional range seen during training.

This does not completely solve long-video extrapolation. It distributes the pressure of a large position index across time, height, and width. A longer video mainly affects the temporal component, while the spatial components preserve their original geometry.

***

# 5. Summary and outlook

## 5.1. The full progression

The development of positional encoding follows a clear sequence. Absolute coordinates were first added to token representations. Relative distance then moved into the attention score. RoPE writes that relative distance into the query-key inner product through rotations. In multimodal models, the same problem expands from a one-dimensional sequence to $(t,h,w)$ coordinates.

| Method | Mechanism | Main advantage | Main limitation | Representative models |
| :-- | :-- | :-- | :-- | :-- |
| **Learned APE** | Position-vector lookup | Flexible | No extrapolation, many parameters, no translation invariance | BERT, GPT-2 |
| **Sinusoidal APE** | Trigonometric functions | Parameter-free, supports extrapolation | Relative positions are implicit; poor long-range decay | Transformer, GPT-3 |
| **Relative PE** | Relative-distance bias | Direct relative positions | Breaks efficient KV-cache reuse | T5, Transformer-XL |
| **RoPE (1D)** | Rotation matrices | Absolute operation, relative effect, KV-cache friendly | One-dimensional design does not extend directly to multimodal data | LLaMA, Qwen-LM |
| **2D/M-RoPE** | Factorized multidimensional rotations | Unified multimodal coordinates and less pressure on long-video extrapolation | More complex implementation; frequency allocation still needs tuning | Qwen2-VL, Qwen2.5-VL |

## 5.2. Design principles

Several design principles recur across these methods:

1. **Make the intended relation explicit:** RoPE gives relative distance a direct mathematical path into the attention inner product, while multidimensional variants make image and video coordinates explicit.

2. **Use orthogonality to limit disturbance:** RoPE's orthogonal rotation preserves vector magnitude, keeping the change to the representation space controlled.

3. **Use one coordinate system across modalities:** M-RoPE represents text, images, and video in $(t,h,w)$ coordinates instead of maintaining incompatible positional semantics for each modality.

4. **Factorize large positions:** M-RoPE breaks a long video's large 1D index into time, height, and width, reducing the extrapolation pressure on any one coordinate.

## 5.3. Open research questions

RoPE and its multidimensional variants are now standard choices in many LLMs and VLMs, but several questions still require training and evaluation:

- **Adaptive frequencies:** tasks such as dense object detection and long-range reasoning may need different frequency distributions. Can the base of $\theta_i$ be adjusted dynamically?

- **Combining explicit timestamps with implicit time encoding:** Qwen3-VL introduces explicit textual timestamps. The benefits and costs of combining them with RoPE's implicit temporal positions still need to be measured task by task.

- **Hierarchical, multi-scale positions:** most current methods place all information in position IDs. A finer design may distinguish global position, local-window position, and position within a patch.

- **Joint design of position encoding and attention:** RoPE is closely tied to dot-product attention. Linear and sparse attention may require a different positional design.

***

<br>

# 6. Further reading

The following articles provide more detail on the derivations and implementations:

**Theory and implementation**

- [Scientific Spaces: Rotary Position Embedding (RoPE)](https://spaces.ac.cn/archives/9431), a detailed derivation and intuitive explanation by RoPE's first author, Jianlin Su.

- [Scientific Spaces: Positional Encoding and Length Extrapolation](https://spaces.ac.cn/archives/10814), an analysis of long-sequence extrapolation.

- [Scientific Spaces: Extending Rotary Position Embedding to Multiple Dimensions](https://spaces.ac.cn/archives/10816), a derivation and discussion of M-RoPE.

<br>

*These are my personal notes on the topic. Corrections are welcome.*
