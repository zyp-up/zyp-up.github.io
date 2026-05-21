# Protect MathJax dollar-delimited TeX from kramdown's Markdown span parsing.
#
# kramdown parses emphasis before MathJax runs in the browser, so inline TeX like
# $\mathcal{R}_{m}$ can be split into <em> tags. This hook temporarily replaces
# $...$ segments with neutral placeholders before Markdown rendering, then
# restores the original TeX in the generated HTML. Display math written with
# $$...$$ is left to kramdown because it is already protected by kramdown's math
# parser and should keep its normal block-level output.

module MathJaxMarkdownProtector
  TOKEN_PREFIX = "JXLMATHPLACEHOLDER".freeze

  module_function

  def protect(content)
    state = { tokens: [], fenced: false }
    protected = +""
    i = 0
    line_start = true

    while i < content.length
      if line_start && fence_marker_at(content, i)
        line_end = content.index("\n", i) || content.length
        state[:fenced] = !state[:fenced]
        protected << content[i...line_end]
        i = line_end
        line_start = false
        next
      end

      char = content[i]

      if char == "\n"
        protected << char
        i += 1
        line_start = true
        next
      end

      if state[:fenced]
        protected << char
        i += 1
        line_start = false
        next
      end

      if char == "`"
        span, new_index = read_code_span(content, i)
        protected << span
        i = new_index
        line_start = false
        next
      end

      if char == "$" && content[i + 1] == "$" && !escaped?(content, i)
        protected << "$$"
        i += 2
        line_start = false
        next
      end

      if char == "$" && !escaped?(content, i)
        math, new_index = read_inline_math(content, i)
        if math
          token = token_for(state, math)
          protected << token
          i = new_index
          line_start = false
          next
        end
      end

      protected << char
      i += 1
      line_start = false
    end

    [protected, state[:tokens]]
  end

  def restore(content, tokens)
    tokens.each_with_index do |math, index|
      content = content.gsub("#{TOKEN_PREFIX}#{index}X", math)
    end
    content
  end

  def fence_marker_at(content, index)
    content[index, 3] == "```" || content[index, 3] == "~~~"
  end

  def read_code_span(content, index)
    delimiter_end = index
    delimiter_end += 1 while content[delimiter_end] == "`"
    delimiter = content[index...delimiter_end]
    closing = content.index(delimiter, delimiter_end)
    return [content[index], index + 1] unless closing

    [content[index...(closing + delimiter.length)], closing + delimiter.length]
  end

  def read_inline_math(content, index)
    delimiter = "$"
    start = index + 1
    cursor = start

    while cursor < content.length
      break if content[cursor] == "\n"

      if content[cursor] == delimiter && content[cursor + 1] != "$" && !escaped?(content, cursor)
        end_index = cursor + 1
        return [content[index...end_index], end_index]
      end

      cursor += 1
    end

    nil
  end

  def escaped?(content, index)
    slash_count = 0
    cursor = index - 1
    while cursor >= 0 && content[cursor] == "\\"
      slash_count += 1
      cursor -= 1
    end
    slash_count.odd?
  end

  def token_for(state, math)
    index = state[:tokens].length
    state[:tokens] << math
    "#{TOKEN_PREFIX}#{index}X"
  end
end

Jekyll::Hooks.register [:pages, :documents], :pre_render do |item|
  path = if item.respond_to?(:relative_path)
           item.relative_path.to_s
         elsif item.respond_to?(:path)
           item.path.to_s
         else
           ""
         end
  next unless path.end_with?(".md", ".markdown")
  next unless item.content.include?("$")

  protected_content, tokens = MathJaxMarkdownProtector.protect(item.content)
  item.content = protected_content
  item.data["mathjax_markdown_tokens"] = tokens
end

Jekyll::Hooks.register [:pages, :documents], :post_render do |item|
  tokens = item.data["mathjax_markdown_tokens"]
  next unless tokens && !tokens.empty?

  item.output = MathJaxMarkdownProtector.restore(item.output, tokens)
end
