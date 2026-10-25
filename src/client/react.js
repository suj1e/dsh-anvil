// React 由 DSH 的模块加载器在运行时注入（见 index.jsx），这里用 live binding 共享给各组件。
// JSX 编译为 h(...)，见 scripts/build.mjs 的 jsxFactory。
export let React
export let ReactDOM
export let h
export let Fragment

export function setReact(react, reactDom) {
  React = react
  ReactDOM = reactDom
  h = react.createElement
  Fragment = react.Fragment
}
