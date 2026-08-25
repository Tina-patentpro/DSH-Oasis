window.__ModuleLoader__.load({
	id: "oasis-professional-service",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client.js
		const inject = ["slots"];
		const ENTRY_ID = "oasis-professional-entry";
		const OPEN_EVENT = "oasis-professional-service:open";
		function WorkbenchEntry() {
			function requestOpen() {
				if (typeof window === "undefined") return;
				window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { source: "conversation.input.right" } }));
			}
			return (0, react.createElement)("button", {
				type: "button",
				className: ENTRY_ID,
				title: "打开技术研发与中国发明专利工作台",
				"aria-label": "打开技术研发与中国发明专利工作台",
				onClick: requestOpen
			}, "研发 / 专利");
		}
		function apply(ctx) {
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: ENTRY_ID,
				order: 80,
				label: "Oasis professional workbench"
			}, () => (0, react.createElement)(WorkbenchEntry)));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map