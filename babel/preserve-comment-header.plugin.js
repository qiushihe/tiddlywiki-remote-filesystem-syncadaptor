// This is taken from: https://github.com/loganfsmyth/babel-plugin-preserve-comment-header

"use strict";

module.exports = function preserveCommentHeader(api) {
  return {
    visitor: {
      Program(path, state) {
        const { pattern = "@license" } = state.opts;

        const firstComment =
          path.node.body.length > 0 &&
          path.node.body[0].leadingComments &&
          path.node.body[0].leadingComments.length > 0 &&
          path.node.body[0].leadingComments[0];

        if (!firstComment) return;

        if (
          (typeof pattern === "string" &&
            firstComment.value.indexOf(pattern) !== -1) ||
          (typeof pattern !== "string" && pattern.test(firstComment.value))
        ) {
          path.node.innerComments = path.node.innerComments || [];

          path.node.innerComments.push(firstComment);
          path.node.body[0].leadingComments.shift();
        }
      }
    }
  };
};
