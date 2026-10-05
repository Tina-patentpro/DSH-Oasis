window.__ModuleLoader__.load({
	id: "oasis-professional-service",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let react_dom = require("react-dom");
		//#region src/client/layout-adapter.js
		const LAYOUT_CONTRACT = "dsh-0.1.1-rc.2";
		const OWNER = "oasis-professional-service";
		const WIDTH_VARIABLE = "--oasis-right-rail-width";
		const OWNER_ATTRIBUTE = "data-oasis-layout-owner";
		const CONTRACT_ATTRIBUTE = "data-oasis-layout-contract";
		const PORTAL_ATTRIBUTE = "data-oasis-panel-portal";
		const STYLE_ATTRIBUTE = "data-oasis-layout-style";
		const NARROW_BREAKPOINT = 1024;
		const MIN_CENTER_WIDTH = 520;
		const layoutCss = `
#root[${OWNER_ATTRIBUTE}="${OWNER}"] {
  margin-right: var(${WIDTH_VARIABLE}, 0px);
  width: calc(100% - var(${WIDTH_VARIABLE}, 0px));
  transition:
    margin-right var(--ds-transition-duration-slow, 180ms) var(--ds-ease-in-out, ease),
    width var(--ds-transition-duration-slow, 180ms) var(--ds-ease-in-out, ease);
}
[${PORTAL_ATTRIBUTE}] {
  position: fixed;
  inset: 0;
  z-index: 40;
  overflow: hidden;
  pointer-events: none;
}
[${PORTAL_ATTRIBUTE}] [data-oasis-panel] { pointer-events: auto; }
@media (prefers-reduced-motion: reduce) {
  #root[${OWNER_ATTRIBUTE}="${OWNER}"] { transition: none; }
}
`;
		function one(nodes, reason) {
			return nodes.length === 1 ? {
				ok: true,
				node: nodes[0]
			} : {
				ok: false,
				reason
			};
		}
		function directFrameChild(frame, node) {
			let current = node;
			while (current?.parentElement && current.parentElement !== frame) current = current.parentElement;
			return current?.parentElement === frame ? current : null;
		}
		function validRect(rect) {
			return rect && Number.isFinite(rect.left) && Number.isFinite(rect.right) && rect.right > rect.left && (rect.width === void 0 || rect.width > 0);
		}
		function validBoundaryRect(rect) {
			return rect && Number.isFinite(rect.left) && Number.isFinite(rect.right) && rect.right >= rect.left && (rect.width === void 0 || rect.width >= 0);
		}
		function detectDshLayout(document, window) {
			if (!document || !window) return {
				ok: false,
				reason: "browser-dom-unavailable"
			};
			const root = document.getElementById?.("root");
			if (!root) return {
				ok: false,
				reason: "root-missing"
			};
			const rootSlotResult = one([...root.querySelectorAll("[data-slot=\"root\"]")], "root-slot-not-unique");
			if (!rootSlotResult.ok) return rootSlotResult;
			const overlayResult = one([...document.querySelectorAll("[data-shell-overlay]")], "shell-overlay-not-unique");
			if (!overlayResult.ok) return overlayResult;
			const frame = overlayResult.node.parentElement;
			if (!frame || !rootSlotResult.node.contains(frame) || overlayResult.node.parentElement !== frame) return {
				ok: false,
				reason: "app-frame-relationship-invalid"
			};
			const sidebarResult = one([...frame.querySelectorAll("[data-slot=\"sidebar\"]")], "sidebar-slot-not-unique");
			if (!sidebarResult.ok) return sidebarResult;
			const conversationResult = one([...frame.querySelectorAll("[data-slot=\"conversation\"]")], "conversation-slot-not-unique");
			if (!conversationResult.ok) return conversationResult;
			const sidebarColumn = directFrameChild(frame, sidebarResult.node);
			const conversationColumn = directFrameChild(frame, conversationResult.node);
			if (!sidebarColumn || !conversationColumn || sidebarColumn === conversationColumn) return {
				ok: false,
				reason: "frame-columns-invalid"
			};
			if (window.getComputedStyle?.(frame)?.display !== "grid") return {
				ok: false,
				reason: "app-frame-not-grid"
			};
			const rootRect = root.getBoundingClientRect?.();
			const frameRect = frame.getBoundingClientRect?.();
			const sidebarRect = sidebarColumn.getBoundingClientRect?.();
			const conversationRect = conversationColumn.getBoundingClientRect?.();
			if (![
				rootRect,
				frameRect,
				conversationRect
			].every(validRect) || !validBoundaryRect(sidebarRect)) return {
				ok: false,
				reason: "layout-geometry-invalid"
			};
			return {
				ok: true,
				contract: LAYOUT_CONTRACT,
				nodes: {
					root,
					rootSlot: rootSlotResult.node,
					frame,
					overlay: overlayResult.node,
					sidebarSlot: sidebarResult.node,
					sidebarColumn,
					conversationSlot: conversationResult.node,
					conversationColumn
				},
				rects: {
					root: rootRect,
					frame: frameRect,
					sidebar: sidebarRect,
					conversation: conversationRect
				}
			};
		}
		function resolveEffectiveMode({ requestedMode, viewportWidth, projectedCenterWidth }) {
			if (![
				"hidden",
				"normal",
				"expanded"
			].includes(requestedMode)) throw new Error(`invalid panel mode: ${requestedMode}`);
			if (requestedMode === "hidden") return {
				requestedMode,
				effectiveMode: "hidden",
				status: "idle"
			};
			if (viewportWidth < NARROW_BREAKPOINT) return {
				requestedMode,
				effectiveMode: "expanded",
				status: "narrow-expanded"
			};
			if (requestedMode === "normal" && projectedCenterWidth < MIN_CENTER_WIDTH) return {
				requestedMode,
				effectiveMode: "expanded",
				status: "capacity-expanded"
			};
			return {
				requestedMode,
				effectiveMode: requestedMode,
				status: "active"
			};
		}
		function sameNodeContract(a, b) {
			return a?.ok && b?.ok && a.nodes.root === b.nodes.root && a.nodes.frame === b.nodes.frame && a.nodes.overlay === b.nodes.overlay && a.nodes.sidebarColumn === b.nodes.sidebarColumn && a.nodes.conversationColumn === b.nodes.conversationColumn;
		}
		function createLayoutAdapter({ document = globalThis.document, window = globalThis.window, watch = true } = {}) {
			const listeners = /* @__PURE__ */ new Set();
			let snapshot = Object.freeze({
				requestedMode: "hidden",
				effectiveMode: "hidden",
				status: "idle",
				reasonCode: null,
				contract: null,
				panelLeft: null,
				panelWidth: 360
			});
			let portalHost = null;
			let styleElement = null;
			let ownedRoot = null;
			let ownsPush = false;
			let disposed = false;
			let applying = false;
			let lastRequest = null;
			let mutationObserver = null;
			let resizeObserver = null;
			let resizeListener = null;
			let scheduledFrame = null;
			let verificationTimer = null;
			let guardedContract = null;
			function publish(next) {
				const normalized = Object.freeze({
					...snapshot,
					...next
				});
				if (JSON.stringify(normalized) === JSON.stringify(snapshot)) return snapshot;
				snapshot = normalized;
				for (const listener of [...listeners]) listener();
				return snapshot;
			}
			function clearScheduled() {
				if (scheduledFrame !== null && window?.cancelAnimationFrame) window.cancelAnimationFrame(scheduledFrame);
				scheduledFrame = null;
				if (verificationTimer !== null && window?.clearTimeout) window.clearTimeout(verificationTimer);
				verificationTimer = null;
			}
			function stopGuards() {
				mutationObserver?.disconnect?.();
				resizeObserver?.disconnect?.();
				mutationObserver = null;
				resizeObserver = null;
				if (resizeListener && window?.removeEventListener) window.removeEventListener("resize", resizeListener);
				resizeListener = null;
				guardedContract = null;
				clearScheduled();
			}
			function clearPush() {
				if (ownedRoot?.getAttribute?.(OWNER_ATTRIBUTE) === OWNER) {
					ownedRoot.removeAttribute(OWNER_ATTRIBUTE);
					ownedRoot.removeAttribute(CONTRACT_ATTRIBUTE);
				}
				if (ownsPush) document?.documentElement?.style?.removeProperty?.(WIDTH_VARIABLE);
				ownedRoot = null;
				ownsPush = false;
			}
			function ensureStyle() {
				if (styleElement?.isConnected) return styleElement;
				if ([...document?.head?.querySelectorAll?.(`[${STYLE_ATTRIBUTE}]`) ?? []].length > 0) throw new Error("an Oasis layout style already exists without this adapter ownership");
				styleElement = document.createElement("style");
				styleElement.setAttribute(STYLE_ATTRIBUTE, "");
				styleElement.textContent = layoutCss;
				document.head.appendChild(styleElement);
				return styleElement;
			}
			function foreignLayoutReason(contract) {
				const owner = contract.nodes.root.getAttribute?.(OWNER_ATTRIBUTE);
				if (owner && owner !== OWNER) return "foreign-oasis-layout-owner";
				if ((document.querySelectorAll?.("[data-dsh-better-sidebar]") ?? []).length > 0) return "better-sidebar-present";
				if ((document.documentElement.style.getPropertyValue?.(WIDTH_VARIABLE) ?? "") && !ownsPush) return "foreign-oasis-width-variable";
				return null;
			}
			function fault(reasonCode, status = "faulted") {
				stopGuards();
				clearPush();
				return publish({
					effectiveMode: "hidden",
					status,
					reasonCode,
					panelLeft: null
				});
			}
			function scheduleReapply(reasonCode) {
				if (!watch || scheduledFrame !== null || disposed || !window?.requestAnimationFrame) return;
				scheduledFrame = window.requestAnimationFrame(() => {
					scheduledFrame = null;
					if (!portalHost?.isConnected) {
						fault("portal-host-lost");
						return;
					}
					const current = detectDshLayout(document, window);
					if (!sameNodeContract(guardedContract, current)) clearPush();
					if (!current.ok) {
						fault(current.reason, "incompatible");
						return;
					}
					if (lastRequest) apply({
						...lastRequest,
						reasonCode
					});
				});
			}
			function startGuards(contract) {
				if (!watch || disposed) return;
				stopGuards();
				guardedContract = contract;
				const MutationObserverClass = window?.MutationObserver;
				if (typeof MutationObserverClass === "function") {
					mutationObserver = new MutationObserverClass(() => scheduleReapply("dom-change"));
					mutationObserver.observe(contract.nodes.frame, { childList: true });
					mutationObserver.observe(document.body, { childList: true });
				}
				const ResizeObserverClass = window?.ResizeObserver;
				if (typeof ResizeObserverClass === "function") {
					resizeObserver = new ResizeObserverClass(() => scheduleReapply("geometry-change"));
					resizeObserver.observe(contract.nodes.root);
					resizeObserver.observe(contract.nodes.sidebarColumn);
					resizeObserver.observe(contract.nodes.conversationColumn);
				}
				if (window?.addEventListener) {
					resizeListener = () => scheduleReapply("viewport-change");
					window.addEventListener("resize", resizeListener);
				}
			}
			function scheduleNormalVerification(contract, panelElement, baselineSidebar) {
				if (!watch || !panelElement || !window?.setTimeout) return;
				verificationTimer = window.setTimeout(() => {
					verificationTimer = null;
					if (snapshot.effectiveMode !== "normal") return;
					const current = detectDshLayout(document, window);
					const panelRect = panelElement.getBoundingClientRect?.();
					if (!current.ok || !validRect(panelRect)) {
						fault("normal-post-check-missing");
						return;
					}
					const rootDelta = Math.abs((current.rects.root.right ?? 0) - panelRect.left);
					const sidebarLeftDelta = Math.abs(current.rects.sidebar.left - baselineSidebar.left);
					const sidebarWidthDelta = Math.abs((current.rects.sidebar.width ?? current.rects.sidebar.right - current.rects.sidebar.left) - (baselineSidebar.width ?? baselineSidebar.right - baselineSidebar.left));
					const conversationOverlap = current.rects.conversation.right - panelRect.left;
					const horizontalOverflow = Number(document.documentElement.scrollWidth ?? 0) > Number(document.documentElement.clientWidth ?? Infinity) + 2;
					if (rootDelta > 2 || sidebarLeftDelta > 1 || sidebarWidthDelta > 1 || conversationOverlap > 2 || horizontalOverflow) fault("normal-post-check-failed");
				}, 260);
			}
			function apply({ requestedMode, panelWidth = 360, panelElement = null, reasonCode = null }) {
				if (disposed) return publish({
					effectiveMode: "hidden",
					status: "faulted",
					reasonCode: "adapter-disposed"
				});
				if (applying) return snapshot;
				applying = true;
				lastRequest = {
					requestedMode,
					panelWidth,
					panelElement
				};
				try {
					if (requestedMode === "hidden") {
						stopGuards();
						clearPush();
						return publish({
							requestedMode,
							effectiveMode: "hidden",
							status: "idle",
							reasonCode,
							panelLeft: null,
							panelWidth
						});
					}
					const contract = detectDshLayout(document, window);
					if (!contract.ok) return fault(contract.reason, "incompatible");
					const conflict = foreignLayoutReason(contract);
					if (conflict) return fault(conflict, "conflict");
					const projectedCenterWidth = contract.rects.conversation.right - contract.rects.conversation.left - panelWidth;
					const resolved = resolveEffectiveMode({
						requestedMode,
						viewportWidth: window.innerWidth,
						projectedCenterWidth
					});
					ensureStyle();
					if (resolved.effectiveMode === "normal") {
						ownedRoot = contract.nodes.root;
						ownedRoot.setAttribute(OWNER_ATTRIBUTE, OWNER);
						ownedRoot.setAttribute(CONTRACT_ATTRIBUTE, LAYOUT_CONTRACT);
						ownsPush = true;
						document.documentElement.style.setProperty(WIDTH_VARIABLE, `${panelWidth}px`);
					} else clearPush();
					const next = publish({
						...resolved,
						reasonCode,
						contract: LAYOUT_CONTRACT,
						panelLeft: resolved.effectiveMode === "expanded" ? contract.rects.sidebar.right : null,
						panelWidth
					});
					startGuards(contract);
					if (resolved.effectiveMode === "normal") scheduleNormalVerification(contract, panelElement, contract.rects.sidebar);
					return next;
				} catch (error) {
					clearPush();
					return publish({
						requestedMode,
						effectiveMode: "hidden",
						status: "faulted",
						reasonCode: error instanceof Error ? error.message : String(error),
						panelLeft: null,
						panelWidth
					});
				} finally {
					applying = false;
				}
			}
			function mountPortal() {
				if (disposed) throw new Error("layout adapter is disposed");
				if (!document?.body || !document?.head) throw new Error("browser DOM is unavailable");
				if (portalHost?.isConnected) return portalHost;
				if ([...document.querySelectorAll?.(`[${PORTAL_ATTRIBUTE}]`) ?? []].length > 0) throw new Error("an Oasis panel portal already exists without this adapter ownership");
				ensureStyle();
				portalHost = document.createElement("div");
				portalHost.setAttribute(PORTAL_ATTRIBUTE, "");
				document.body.appendChild(portalHost);
				return portalHost;
			}
			function unmountPortal(host = portalHost) {
				stopGuards();
				clearPush();
				if (host && host === portalHost) {
					host.remove?.();
					portalHost = null;
				}
			}
			function releaseStandalone(reasonCode = "standalone-released") {
				if (disposed) return snapshot;
				stopGuards();
				clearPush();
				portalHost?.remove?.();
				portalHost = null;
				styleElement?.remove?.();
				styleElement = null;
				lastRequest = null;
				return publish({
					requestedMode: "hidden",
					effectiveMode: "hidden",
					status: "idle",
					reasonCode,
					panelLeft: null
				});
			}
			function dispose() {
				if (disposed) return;
				releaseStandalone("adapter-disposed");
				listeners.clear();
				disposed = true;
			}
			return Object.freeze({
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				getSnapshot() {
					return snapshot;
				},
				apply,
				restore(reasonCode = "restored") {
					stopGuards();
					clearPush();
					return publish({
						effectiveMode: "hidden",
						status: "idle",
						reasonCode,
						panelLeft: null
					});
				},
				fault,
				mountPortal,
				unmountPortal,
				releaseStandalone,
				dispose
			});
		}
		//#endregion
		//#region node_modules/zod/v4/core/core.js
		var _a$1;
		function $constructor(name, initializer, params) {
			function init(inst, def) {
				if (!inst._zod) Object.defineProperty(inst, "_zod", {
					value: {
						def,
						constr: _,
						traits: /* @__PURE__ */ new Set()
					},
					enumerable: false
				});
				if (inst._zod.traits.has(name)) return;
				inst._zod.traits.add(name);
				initializer(inst, def);
				const proto = _.prototype;
				const keys = Object.keys(proto);
				for (let i = 0; i < keys.length; i++) {
					const k = keys[i];
					if (!(k in inst)) inst[k] = proto[k].bind(inst);
				}
			}
			const Parent = params?.Parent ?? Object;
			class Definition extends Parent {}
			Object.defineProperty(Definition, "name", { value: name });
			function _(def) {
				var _a;
				const inst = params?.Parent ? new Definition() : this;
				init(inst, def);
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				for (const fn of inst._zod.deferred) fn();
				return inst;
			}
			Object.defineProperty(_, "init", { value: init });
			Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
				if (params?.Parent && inst instanceof params.Parent) return true;
				return inst?._zod?.traits?.has(name);
			} });
			Object.defineProperty(_, "name", { value: name });
			return _;
		}
		var $ZodAsyncError = class extends Error {
			constructor() {
				super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
			}
		};
		var $ZodEncodeError = class extends Error {
			constructor(name) {
				super(`Encountered unidirectional transform during encode: ${name}`);
				this.name = "ZodEncodeError";
			}
		};
		(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
		const globalConfig = globalThis.__zod_globalConfig;
		function config(newConfig) {
			if (newConfig) Object.assign(globalConfig, newConfig);
			return globalConfig;
		}
		//#endregion
		//#region node_modules/zod/v4/core/util.js
		function getEnumValues(entries) {
			const numericValues = Object.values(entries).filter((v) => typeof v === "number");
			return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
		}
		function jsonStringifyReplacer(_, value) {
			if (typeof value === "bigint") return value.toString();
			return value;
		}
		function cached(getter) {
			return { get value() {
				{
					const value = getter();
					Object.defineProperty(this, "value", { value });
					return value;
				}
			} };
		}
		function nullish(input) {
			return input === null || input === void 0;
		}
		function cleanRegex(source) {
			const start = source.startsWith("^") ? 1 : 0;
			const end = source.endsWith("$") ? source.length - 1 : source.length;
			return source.slice(start, end);
		}
		function floatSafeRemainder(val, step) {
			const ratio = val / step;
			const roundedRatio = Math.round(ratio);
			const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
			if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
			return ratio - roundedRatio;
		}
		const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
		function defineLazy(object, key, getter) {
			let value = void 0;
			Object.defineProperty(object, key, {
				get() {
					if (value === EVALUATING) return;
					if (value === void 0) {
						value = EVALUATING;
						value = getter();
					}
					return value;
				},
				set(v) {
					Object.defineProperty(object, key, { value: v });
				},
				configurable: true
			});
		}
		function assignProp(target, prop, value) {
			Object.defineProperty(target, prop, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		function mergeDefs(...defs) {
			const mergedDescriptors = {};
			for (const def of defs) {
				const descriptors = Object.getOwnPropertyDescriptors(def);
				Object.assign(mergedDescriptors, descriptors);
			}
			return Object.defineProperties({}, mergedDescriptors);
		}
		function esc(str) {
			return JSON.stringify(str);
		}
		function slugify(input) {
			return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
		}
		const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
		function isObject(data) {
			return typeof data === "object" && data !== null && !Array.isArray(data);
		}
		const allowsEval = /* @__PURE__*/ cached(() => {
			if (globalConfig.jitless) return false;
			if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
			try {
				new Function("");
				return true;
			} catch (_) {
				return false;
			}
		});
		function isPlainObject(o) {
			if (isObject(o) === false) return false;
			const ctor = o.constructor;
			if (ctor === void 0) return true;
			if (typeof ctor !== "function") return true;
			const prot = ctor.prototype;
			if (isObject(prot) === false) return false;
			if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
			return true;
		}
		function shallowClone(o) {
			if (isPlainObject(o)) return { ...o };
			if (Array.isArray(o)) return [...o];
			if (o instanceof Map) return new Map(o);
			if (o instanceof Set) return new Set(o);
			return o;
		}
		const propertyKeyTypes = /* @__PURE__*/ new Set([
			"string",
			"number",
			"symbol"
		]);
		function escapeRegex(str) {
			return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		function clone(inst, def, params) {
			const cl = new inst._zod.constr(def ?? inst._zod.def);
			if (!def || params?.parent) cl._zod.parent = inst;
			return cl;
		}
		function normalizeParams(_params) {
			const params = _params;
			if (!params) return {};
			if (typeof params === "string") return { error: () => params };
			if (params?.message !== void 0) {
				if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
				params.error = params.message;
			}
			delete params.message;
			if (typeof params.error === "string") return {
				...params,
				error: () => params.error
			};
			return params;
		}
		function optionalKeys(shape) {
			return Object.keys(shape).filter((k) => {
				return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
			});
		}
		const NUMBER_FORMAT_RANGES = {
			safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
			int32: [-2147483648, 2147483647],
			uint32: [0, 4294967295],
			float32: [-34028234663852886e22, 34028234663852886e22],
			float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
		};
		function pick(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = {};
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						newShape[key] = currDef.shape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function omit(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = { ...schema._zod.def.shape };
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						delete newShape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function extend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) {
				const existingShape = schema._zod.def.shape;
				for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
			}
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function safeExtend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function merge(a, b) {
			if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
			return clone(a, mergeDefs(a._zod.def, {
				get shape() {
					const _shape = {
						...a._zod.def.shape,
						...b._zod.def.shape
					};
					assignProp(this, "shape", _shape);
					return _shape;
				},
				get catchall() {
					return b._zod.def.catchall;
				},
				checks: b._zod.def.checks ?? []
			}));
		}
		function partial(Class, schema, mask) {
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const oldShape = schema._zod.def.shape;
					const shape = { ...oldShape };
					if (mask) for (const key in mask) {
						if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						shape[key] = Class ? new Class({
							type: "optional",
							innerType: oldShape[key]
						}) : oldShape[key];
					}
					else for (const key in oldShape) shape[key] = Class ? new Class({
						type: "optional",
						innerType: oldShape[key]
					}) : oldShape[key];
					assignProp(this, "shape", shape);
					return shape;
				},
				checks: []
			}));
		}
		function required(Class, schema, mask) {
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const oldShape = schema._zod.def.shape;
				const shape = { ...oldShape };
				if (mask) for (const key in mask) {
					if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
					if (!mask[key]) continue;
					shape[key] = new Class({
						type: "nonoptional",
						innerType: oldShape[key]
					});
				}
				else for (const key in oldShape) shape[key] = new Class({
					type: "nonoptional",
					innerType: oldShape[key]
				});
				assignProp(this, "shape", shape);
				return shape;
			} }));
		}
		function aborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
			return false;
		}
		function explicitlyAborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
			return false;
		}
		function prefixIssues(path, issues) {
			return issues.map((iss) => {
				var _a;
				(_a = iss).path ?? (_a.path = []);
				iss.path.unshift(path);
				return iss;
			});
		}
		function unwrapMessage(message) {
			return typeof message === "string" ? message : message?.message;
		}
		function finalizeIssue(iss, ctx, config) {
			const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
			const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
			rest.path ?? (rest.path = []);
			rest.message = message;
			if (ctx?.reportInput) rest.input = _input;
			return rest;
		}
		function getLengthableOrigin(input) {
			if (Array.isArray(input)) return "array";
			if (typeof input === "string") return "string";
			return "unknown";
		}
		function issue(...args) {
			const [iss, input, inst] = args;
			if (typeof iss === "string") return {
				message: iss,
				code: "custom",
				input,
				inst
			};
			return { ...iss };
		}
		//#endregion
		//#region node_modules/zod/v4/core/errors.js
		const initializer$1 = (inst, def) => {
			inst.name = "$ZodError";
			Object.defineProperty(inst, "_zod", {
				value: inst._zod,
				enumerable: false
			});
			Object.defineProperty(inst, "issues", {
				value: def,
				enumerable: false
			});
			inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
			Object.defineProperty(inst, "toString", {
				value: () => inst.message,
				enumerable: false
			});
		};
		const $ZodError = $constructor("$ZodError", initializer$1);
		const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
		function flattenError(error, mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of error.issues) if (sub.path.length > 0) {
				fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
				fieldErrors[sub.path[0]].push(mapper(sub));
			} else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		function formatError(error, mapper = (issue) => issue.message) {
			const fieldErrors = { _errors: [] };
			const processError = (error, path = []) => {
				for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
				else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else {
					const fullpath = [...path, ...issue.path];
					if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
					else {
						let curr = fieldErrors;
						let i = 0;
						while (i < fullpath.length) {
							const el = fullpath[i];
							if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
							else {
								curr[el] = curr[el] || { _errors: [] };
								curr[el]._errors.push(mapper(issue));
							}
							curr = curr[el];
							i++;
						}
					}
				}
			};
			processError(error);
			return fieldErrors;
		}
		//#endregion
		//#region node_modules/zod/v4/core/parse.js
		const _parse = (_Err) => (schema, value, _ctx, _params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			if (result.issues.length) {
				const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, _params?.callee);
				throw e;
			}
			return result.value;
		};
		const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			if (result.issues.length) {
				const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, params?.callee);
				throw e;
			}
			return result.value;
		};
		const _safeParse = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			return result.issues.length ? {
				success: false,
				error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
		const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			return result.issues.length ? {
				success: false,
				error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
		const _encode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parse(_Err)(schema, value, ctx);
		};
		const _decode = (_Err) => (schema, value, _ctx) => {
			return _parse(_Err)(schema, value, _ctx);
		};
		const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parseAsync(_Err)(schema, value, ctx);
		};
		const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _parseAsync(_Err)(schema, value, _ctx);
		};
		const _safeEncode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParse(_Err)(schema, value, ctx);
		};
		const _safeDecode = (_Err) => (schema, value, _ctx) => {
			return _safeParse(_Err)(schema, value, _ctx);
		};
		const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParseAsync(_Err)(schema, value, ctx);
		};
		const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _safeParseAsync(_Err)(schema, value, _ctx);
		};
		//#endregion
		//#region node_modules/zod/v4/core/regexes.js
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const cuid = /^[cC][0-9a-z]{6,}$/;
		const cuid2 = /^[0-9a-z]+$/;
		const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
		const xid = /^[0-9a-vA-V]{20}$/;
		const ksuid = /^[A-Za-z0-9]{27}$/;
		const nanoid = /^[a-zA-Z0-9_-]{21}$/;
		/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
		const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
		/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
		const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
		/** Returns a regex for validating an RFC 9562/4122 UUID.
		*
		* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
		const uuid = (version) => {
			if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
			return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
		};
		/** Practical email validation */
		const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
		const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
		function emoji() {
			return new RegExp(_emoji$1, "u");
		}
		const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
		const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
		const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
		const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
		const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
		const base64url = /^[A-Za-z0-9_-]*$/;
		const httpProtocol = /^https?$/;
		const e164 = /^\+[1-9]\d{6,14}$/;
		const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
		const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
		function timeSource(args) {
			const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
			return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
		}
		function time$1(args) {
			return new RegExp(`^${timeSource(args)}$`);
		}
		function datetime$1(args) {
			const time = timeSource({ precision: args.precision });
			const opts = ["Z"];
			if (args.local) opts.push("");
			if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
			const timeRegex = `${time}(?:${opts.join("|")})`;
			return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
		}
		const string$1 = (params) => {
			const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
			return new RegExp(`^${regex}$`);
		};
		const integer = /^-?\d+$/;
		const number$1 = /^-?\d+(?:\.\d+)?$/;
		const boolean$1 = /^(?:true|false)$/i;
		const _null$2 = /^null$/i;
		const lowercase = /^[^A-Z]*$/;
		const uppercase = /^[^a-z]*$/;
		//#endregion
		//#region node_modules/zod/v4/core/checks.js
		const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
			var _a;
			inst._zod ?? (inst._zod = {});
			inst._zod.def = def;
			(_a = inst._zod).onattach ?? (_a.onattach = []);
		});
		const numericOriginMap = {
			number: "number",
			bigint: "bigint",
			object: "date"
		};
		const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
				if (def.value < curr) {
					if (def.inclusive) bag.maximum = def.value;
					else bag.exclusiveMaximum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
				if (def.value > curr) {
					if (def.inclusive) bag.minimum = def.value;
					else bag.exclusiveMinimum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				var _a;
				(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
			});
			inst._zod.check = (payload) => {
				if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
				if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
				payload.issues.push({
					origin: typeof payload.value,
					code: "not_multiple_of",
					divisor: def.value,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
			$ZodCheck.init(inst, def);
			def.format = def.format || "float64";
			const isInt = def.format?.includes("int");
			const origin = isInt ? "int" : "number";
			const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				bag.minimum = minimum;
				bag.maximum = maximum;
				if (isInt) bag.pattern = integer;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (isInt) {
					if (!Number.isInteger(input)) {
						payload.issues.push({
							expected: origin,
							format: def.format,
							code: "invalid_type",
							continue: false,
							input,
							inst
						});
						return;
					}
					if (!Number.isSafeInteger(input)) {
						if (input > 0) payload.issues.push({
							input,
							code: "too_big",
							maximum: Number.MAX_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						else payload.issues.push({
							input,
							code: "too_small",
							minimum: Number.MIN_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						return;
					}
				}
				if (input < minimum) payload.issues.push({
					origin: "number",
					input,
					code: "too_small",
					minimum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
				if (input > maximum) payload.issues.push({
					origin: "number",
					input,
					code: "too_big",
					maximum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
				if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length <= def.maximum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: def.maximum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
				if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length >= def.minimum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: def.minimum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.minimum = def.length;
				bag.maximum = def.length;
				bag.length = def.length;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const length = input.length;
				if (length === def.length) return;
				const origin = getLengthableOrigin(input);
				const tooBig = length > def.length;
				payload.issues.push({
					origin,
					...tooBig ? {
						code: "too_big",
						maximum: def.length
					} : {
						code: "too_small",
						minimum: def.length
					},
					inclusive: true,
					exact: true,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
			var _a, _b;
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				if (def.pattern) {
					bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
					bag.patterns.add(def.pattern);
				}
			});
			if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: def.format,
					input: payload.value,
					...def.pattern ? { pattern: def.pattern.toString() } : {},
					inst,
					continue: !def.abort
				});
			});
			else (_b = inst._zod).check ?? (_b.check = () => {});
		});
		const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "regex",
					input: payload.value,
					pattern: def.pattern.toString(),
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
			def.pattern ?? (def.pattern = lowercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
			def.pattern ?? (def.pattern = uppercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
			$ZodCheck.init(inst, def);
			const escapedRegex = escapeRegex(def.includes);
			const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
			def.pattern = pattern;
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.includes(def.includes, def.position)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "includes",
					includes: def.includes,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.startsWith(def.prefix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "starts_with",
					prefix: def.prefix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.endsWith(def.suffix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "ends_with",
					suffix: def.suffix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.check = (payload) => {
				payload.value = def.tx(payload.value);
			};
		});
		//#endregion
		//#region node_modules/zod/v4/core/doc.js
		var Doc = class {
			constructor(args = []) {
				this.content = [];
				this.indent = 0;
				if (this) this.args = args;
			}
			indented(fn) {
				this.indent += 1;
				fn(this);
				this.indent -= 1;
			}
			write(arg) {
				if (typeof arg === "function") {
					arg(this, { execution: "sync" });
					arg(this, { execution: "async" });
					return;
				}
				const lines = arg.split("\n").filter((x) => x);
				const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
				const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
				for (const line of dedented) this.content.push(line);
			}
			compile() {
				const F = Function;
				const args = this?.args;
				const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
				return new F(...args, lines.join("\n"));
			}
		};
		//#endregion
		//#region node_modules/zod/v4/core/versions.js
		const version = {
			major: 4,
			minor: 4,
			patch: 3
		};
		//#endregion
		//#region node_modules/zod/v4/core/schemas.js
		const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
			var _a;
			inst ?? (inst = {});
			inst._zod.def = def;
			inst._zod.bag = inst._zod.bag || {};
			inst._zod.version = version;
			const checks = [...inst._zod.def.checks ?? []];
			if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
			for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
			if (checks.length === 0) {
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred?.push(() => {
					inst._zod.run = inst._zod.parse;
				});
			} else {
				const runChecks = (payload, checks, ctx) => {
					let isAborted = aborted(payload);
					let asyncResult;
					for (const ch of checks) {
						if (ch._zod.def.when) {
							if (explicitlyAborted(payload)) continue;
							if (!ch._zod.def.when(payload)) continue;
						} else if (isAborted) continue;
						const currLen = payload.issues.length;
						const _ = ch._zod.check(payload);
						if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
						if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
							await _;
							if (payload.issues.length === currLen) return;
							if (!isAborted) isAborted = aborted(payload, currLen);
						});
						else {
							if (payload.issues.length === currLen) continue;
							if (!isAborted) isAborted = aborted(payload, currLen);
						}
					}
					if (asyncResult) return asyncResult.then(() => {
						return payload;
					});
					return payload;
				};
				const handleCanaryResult = (canary, payload, ctx) => {
					if (aborted(canary)) {
						canary.aborted = true;
						return canary;
					}
					const checkResult = runChecks(payload, checks, ctx);
					if (checkResult instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
					}
					return inst._zod.parse(checkResult, ctx);
				};
				inst._zod.run = (payload, ctx) => {
					if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
					if (ctx.direction === "backward") {
						const canary = inst._zod.parse({
							value: payload.value,
							issues: []
						}, {
							...ctx,
							skipChecks: true
						});
						if (canary instanceof Promise) return canary.then((canary) => {
							return handleCanaryResult(canary, payload, ctx);
						});
						return handleCanaryResult(canary, payload, ctx);
					}
					const result = inst._zod.parse(payload, ctx);
					if (result instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return result.then((result) => runChecks(result, checks, ctx));
					}
					return runChecks(result, checks, ctx);
				};
			}
			defineLazy(inst, "~standard", () => ({
				validate: (value) => {
					try {
						const r = safeParse$1(inst, value);
						return r.success ? { value: r.data } : { issues: r.error?.issues };
					} catch (_) {
						return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
					}
				},
				vendor: "zod",
				version: 1
			}));
		});
		const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
			inst._zod.parse = (payload, _) => {
				if (def.coerce) try {
					payload.value = String(payload.value);
				} catch (_) {}
				if (typeof payload.value === "string") return payload;
				payload.issues.push({
					expected: "string",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			$ZodString.init(inst, def);
		});
		const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
			def.pattern ?? (def.pattern = guid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
			if (def.version) {
				const v = {
					v1: 1,
					v2: 2,
					v3: 3,
					v4: 4,
					v5: 5,
					v6: 6,
					v7: 7,
					v8: 8
				}[def.version];
				if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
				def.pattern ?? (def.pattern = uuid(v));
			} else def.pattern ?? (def.pattern = uuid());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
			def.pattern ?? (def.pattern = email);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				try {
					const trimmed = payload.value.trim();
					if (!def.normalize && def.protocol?.source === httpProtocol.source) {
						if (!/^https?:\/\//i.test(trimmed)) {
							payload.issues.push({
								code: "invalid_format",
								format: "url",
								note: "Invalid URL format",
								input: payload.value,
								inst,
								continue: !def.abort
							});
							return;
						}
					}
					const url = new URL(trimmed);
					if (def.hostname) {
						def.hostname.lastIndex = 0;
						if (!def.hostname.test(url.hostname)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid hostname",
							pattern: def.hostname.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.protocol) {
						def.protocol.lastIndex = 0;
						if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid protocol",
							pattern: def.protocol.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.normalize) payload.value = url.href;
					else payload.value = trimmed;
					return;
				} catch (_) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
			def.pattern ?? (def.pattern = emoji());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
			def.pattern ?? (def.pattern = nanoid);
			$ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
			def.pattern ?? (def.pattern = cuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
			def.pattern ?? (def.pattern = cuid2);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
			def.pattern ?? (def.pattern = ulid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
			def.pattern ?? (def.pattern = xid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
			def.pattern ?? (def.pattern = ksuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
			def.pattern ?? (def.pattern = datetime$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
			def.pattern ?? (def.pattern = date$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
			def.pattern ?? (def.pattern = time$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
			def.pattern ?? (def.pattern = duration$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
			def.pattern ?? (def.pattern = ipv4);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv4`;
		});
		const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
			def.pattern ?? (def.pattern = ipv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv6`;
			inst._zod.check = (payload) => {
				try {
					new URL(`http://[${payload.value}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "ipv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv4);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				const parts = payload.value.split("/");
				try {
					if (parts.length !== 2) throw new Error();
					const [address, prefix] = parts;
					if (!prefix) throw new Error();
					const prefixNum = Number(prefix);
					if (`${prefixNum}` !== prefix) throw new Error();
					if (prefixNum < 0 || prefixNum > 128) throw new Error();
					new URL(`http://[${address}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "cidrv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		function isValidBase64(data) {
			if (data === "") return true;
			if (/\s/.test(data)) return false;
			if (data.length % 4 !== 0) return false;
			try {
				atob(data);
				return true;
			} catch {
				return false;
			}
		}
		const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
			def.pattern ?? (def.pattern = base64);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64";
			inst._zod.check = (payload) => {
				if (isValidBase64(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		function isValidBase64URL(data) {
			if (!base64url.test(data)) return false;
			const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
			return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
		}
		const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
			def.pattern ?? (def.pattern = base64url);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64url";
			inst._zod.check = (payload) => {
				if (isValidBase64URL(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
			def.pattern ?? (def.pattern = e164);
			$ZodStringFormat.init(inst, def);
		});
		function isValidJWT(token, algorithm = null) {
			try {
				const tokensParts = token.split(".");
				if (tokensParts.length !== 3) return false;
				const [header] = tokensParts;
				if (!header) return false;
				const parsedHeader = JSON.parse(atob(header));
				if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
				if (!parsedHeader.alg) return false;
				if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
				return true;
			} catch {
				return false;
			}
		}
		const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				if (isValidJWT(payload.value, def.alg)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "jwt",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Number(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
				const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
				payload.issues.push({
					expected: "number",
					code: "invalid_type",
					input,
					inst,
					...received ? { received } : {}
				});
				return payload;
			};
		});
		const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
			$ZodCheckNumberFormat.init(inst, def);
			$ZodNumber.init(inst, def);
		});
		const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = boolean$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Boolean(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "boolean") return payload;
				payload.issues.push({
					expected: "boolean",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodNull = /*@__PURE__*/ $constructor("$ZodNull", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = _null$2;
			inst._zod.values = /* @__PURE__ */ new Set([null]);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (input === null) return payload;
				payload.issues.push({
					expected: "null",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload) => payload;
		});
		const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _ctx) => {
				payload.issues.push({
					expected: "never",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		function handleArrayResult(result, final, index) {
			if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
			final.value[index] = result.value;
		}
		const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!Array.isArray(input)) {
					payload.issues.push({
						expected: "array",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = Array(input.length);
				const proms = [];
				for (let i = 0; i < input.length; i++) {
					const item = input[i];
					const result = def.element._zod.run({
						value: item,
						issues: []
					}, ctx);
					if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
					else handleArrayResult(result, payload, i);
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
			const isPresent = key in input;
			if (result.issues.length) {
				if (isOptionalIn && isOptionalOut && !isPresent) return;
				final.issues.push(...prefixIssues(key, result.issues));
			}
			if (!isPresent && !isOptionalIn) {
				if (!result.issues.length) final.issues.push({
					code: "invalid_type",
					expected: "nonoptional",
					input: void 0,
					path: [key]
				});
				return;
			}
			if (result.value === void 0) {
				if (isPresent) final.value[key] = void 0;
			} else final.value[key] = result.value;
		}
		function normalizeDef(def) {
			const keys = Object.keys(def.shape);
			for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
			const okeys = optionalKeys(def.shape);
			return {
				...def,
				keys,
				keySet: new Set(keys),
				numKeys: keys.length,
				optionalKeys: new Set(okeys)
			};
		}
		function handleCatchall(proms, input, payload, ctx, def, inst) {
			const unrecognized = [];
			const keySet = def.keySet;
			const _catchall = def.catchall._zod;
			const t = _catchall.def.type;
			const isOptionalIn = _catchall.optin === "optional";
			const isOptionalOut = _catchall.optout === "optional";
			for (const key in input) {
				if (key === "__proto__") continue;
				if (keySet.has(key)) continue;
				if (t === "never") {
					unrecognized.push(key);
					continue;
				}
				const r = _catchall.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
				else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
			}
			if (unrecognized.length) payload.issues.push({
				code: "unrecognized_keys",
				keys: unrecognized,
				input,
				inst
			});
			if (!proms.length) return payload;
			return Promise.all(proms).then(() => {
				return payload;
			});
		}
		const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
			$ZodType.init(inst, def);
			if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
				const sh = def.shape;
				Object.defineProperty(def, "shape", { get: () => {
					const newSh = { ...sh };
					Object.defineProperty(def, "shape", { value: newSh });
					return newSh;
				} });
			}
			const _normalized = cached(() => normalizeDef(def));
			defineLazy(inst._zod, "propValues", () => {
				const shape = def.shape;
				const propValues = {};
				for (const key in shape) {
					const field = shape[key]._zod;
					if (field.values) {
						propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
						for (const v of field.values) propValues[key].add(v);
					}
				}
				return propValues;
			});
			const isObject$1 = isObject;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$1(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = {};
				const proms = [];
				const shape = value.shape;
				for (const key of value.keys) {
					const el = shape[key];
					const isOptionalIn = el._zod.optin === "optional";
					const isOptionalOut = el._zod.optout === "optional";
					const r = el._zod.run({
						value: input[key],
						issues: []
					}, ctx);
					if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
					else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
				}
				if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
				return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
			};
		});
		const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
			$ZodObject.init(inst, def);
			const superParse = inst._zod.parse;
			const _normalized = cached(() => normalizeDef(def));
			const generateFastpass = (shape) => {
				const doc = new Doc([
					"shape",
					"payload",
					"ctx"
				]);
				const normalized = _normalized.value;
				const parseStr = (key) => {
					const k = esc(key);
					return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
				};
				doc.write(`const input = payload.value;`);
				const ids = Object.create(null);
				let counter = 0;
				for (const key of normalized.keys) ids[key] = `key_${counter++}`;
				doc.write(`const newResult = {};`);
				for (const key of normalized.keys) {
					const id = ids[key];
					const k = esc(key);
					const schema = shape[key];
					const isOptionalIn = schema?._zod?.optin === "optional";
					const isOptionalOut = schema?._zod?.optout === "optional";
					doc.write(`const ${id} = ${parseStr(key)};`);
					if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
					else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
					else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
				}
				doc.write(`payload.value = newResult;`);
				doc.write(`return payload;`);
				const fn = doc.compile();
				return (payload, ctx) => fn(shape, payload, ctx);
			};
			let fastpass;
			const isObject$2 = isObject;
			const jit = !globalConfig.jitless;
			const fastEnabled = jit && allowsEval.value;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$2(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
					if (!fastpass) fastpass = generateFastpass(def.shape);
					payload = fastpass(payload, ctx);
					if (!catchall) return payload;
					return handleCatchall([], input, payload, ctx, value, inst);
				}
				return superParse(payload, ctx);
			};
		});
		function handleUnionResults(results, final, inst, ctx) {
			for (const result of results) if (result.issues.length === 0) {
				final.value = result.value;
				return final;
			}
			const nonaborted = results.filter((r) => !aborted(r));
			if (nonaborted.length === 1) {
				final.value = nonaborted[0].value;
				return nonaborted[0];
			}
			final.issues.push({
				code: "invalid_union",
				input: final.value,
				inst,
				errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			});
			return final;
		}
		const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "values", () => {
				if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
			});
			defineLazy(inst._zod, "pattern", () => {
				if (def.options.every((o) => o._zod.pattern)) {
					const patterns = def.options.map((o) => o._zod.pattern);
					return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
				}
			});
			const first = def.options.length === 1 ? def.options[0]._zod.run : null;
			inst._zod.parse = (payload, ctx) => {
				if (first) return first(payload, ctx);
				let async = false;
				const results = [];
				for (const option of def.options) {
					const result = option._zod.run({
						value: payload.value,
						issues: []
					}, ctx);
					if (result instanceof Promise) {
						results.push(result);
						async = true;
					} else {
						if (result.issues.length === 0) return result;
						results.push(result);
					}
				}
				if (!async) return handleUnionResults(results, payload, inst, ctx);
				return Promise.all(results).then((results) => {
					return handleUnionResults(results, payload, inst, ctx);
				});
			};
		});
		const $ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
			def.inclusive = false;
			$ZodUnion.init(inst, def);
			const _super = inst._zod.parse;
			defineLazy(inst._zod, "propValues", () => {
				const propValues = {};
				for (const option of def.options) {
					const pv = option._zod.propValues;
					if (!pv || Object.keys(pv).length === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
					for (const [k, v] of Object.entries(pv)) {
						if (!propValues[k]) propValues[k] = /* @__PURE__ */ new Set();
						for (const val of v) propValues[k].add(val);
					}
				}
				return propValues;
			});
			const disc = cached(() => {
				const opts = def.options;
				const map = /* @__PURE__ */ new Map();
				for (const o of opts) {
					const values = o._zod.propValues?.[def.discriminator];
					if (!values || values.size === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
					for (const v of values) {
						if (map.has(v)) throw new Error(`Duplicate discriminator value "${String(v)}"`);
						map.set(v, o);
					}
				}
				return map;
			});
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!isObject(input)) {
					payload.issues.push({
						code: "invalid_type",
						expected: "object",
						input,
						inst
					});
					return payload;
				}
				const opt = disc.value.get(input?.[def.discriminator]);
				if (opt) return opt._zod.run(payload, ctx);
				if (def.unionFallback || ctx.direction === "backward") return _super(payload, ctx);
				payload.issues.push({
					code: "invalid_union",
					errors: [],
					note: "No matching discriminator",
					discriminator: def.discriminator,
					options: Array.from(disc.value.keys()),
					input,
					path: [def.discriminator],
					inst
				});
				return payload;
			};
		});
		const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				const left = def.left._zod.run({
					value: input,
					issues: []
				}, ctx);
				const right = def.right._zod.run({
					value: input,
					issues: []
				}, ctx);
				if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
					return handleIntersectionResults(payload, left, right);
				});
				return handleIntersectionResults(payload, left, right);
			};
		});
		function mergeValues(a, b) {
			if (a === b) return {
				valid: true,
				data: a
			};
			if (a instanceof Date && b instanceof Date && +a === +b) return {
				valid: true,
				data: a
			};
			if (isPlainObject(a) && isPlainObject(b)) {
				const bKeys = Object.keys(b);
				const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
				const newObj = {
					...a,
					...b
				};
				for (const key of sharedKeys) {
					const sharedValue = mergeValues(a[key], b[key]);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
					};
					newObj[key] = sharedValue.data;
				}
				return {
					valid: true,
					data: newObj
				};
			}
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return {
					valid: false,
					mergeErrorPath: []
				};
				const newArray = [];
				for (let index = 0; index < a.length; index++) {
					const itemA = a[index];
					const itemB = b[index];
					const sharedValue = mergeValues(itemA, itemB);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
					};
					newArray.push(sharedValue.data);
				}
				return {
					valid: true,
					data: newArray
				};
			}
			return {
				valid: false,
				mergeErrorPath: []
			};
		}
		function handleIntersectionResults(result, left, right) {
			const unrecKeys = /* @__PURE__ */ new Map();
			let unrecIssue;
			for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
				unrecIssue ?? (unrecIssue = iss);
				for (const k of iss.keys) {
					if (!unrecKeys.has(k)) unrecKeys.set(k, {});
					unrecKeys.get(k).l = true;
				}
			} else result.issues.push(iss);
			for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
				if (!unrecKeys.has(k)) unrecKeys.set(k, {});
				unrecKeys.get(k).r = true;
			}
			else result.issues.push(iss);
			const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
			if (bothKeys.length && unrecIssue) result.issues.push({
				...unrecIssue,
				keys: bothKeys
			});
			if (aborted(result)) return result;
			const merged = mergeValues(left.value, right.value);
			if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
			result.value = merged.data;
			return result;
		}
		const $ZodRecord = /*@__PURE__*/ $constructor("$ZodRecord", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!isPlainObject(input)) {
					payload.issues.push({
						expected: "record",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				const proms = [];
				const values = def.keyType._zod.values;
				if (values) {
					payload.value = {};
					const recordKeys = /* @__PURE__ */ new Set();
					for (const key of values) if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
						recordKeys.add(typeof key === "number" ? key.toString() : key);
						const keyResult = def.keyType._zod.run({
							value: key,
							issues: []
						}, ctx);
						if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
						if (keyResult.issues.length) {
							payload.issues.push({
								code: "invalid_key",
								origin: "record",
								issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
								input: key,
								path: [key],
								inst
							});
							continue;
						}
						const outKey = keyResult.value;
						const result = def.valueType._zod.run({
							value: input[key],
							issues: []
						}, ctx);
						if (result instanceof Promise) proms.push(result.then((result) => {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[outKey] = result.value;
						}));
						else {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[outKey] = result.value;
						}
					}
					let unrecognized;
					for (const key in input) if (!recordKeys.has(key)) {
						unrecognized = unrecognized ?? [];
						unrecognized.push(key);
					}
					if (unrecognized && unrecognized.length > 0) payload.issues.push({
						code: "unrecognized_keys",
						input,
						inst,
						keys: unrecognized
					});
				} else {
					payload.value = {};
					for (const key of Reflect.ownKeys(input)) {
						if (key === "__proto__") continue;
						if (!Object.prototype.propertyIsEnumerable.call(input, key)) continue;
						let keyResult = def.keyType._zod.run({
							value: key,
							issues: []
						}, ctx);
						if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
						if (typeof key === "string" && number$1.test(key) && keyResult.issues.length) {
							const retryResult = def.keyType._zod.run({
								value: Number(key),
								issues: []
							}, ctx);
							if (retryResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
							if (retryResult.issues.length === 0) keyResult = retryResult;
						}
						if (keyResult.issues.length) {
							if (def.mode === "loose") payload.value[key] = input[key];
							else payload.issues.push({
								code: "invalid_key",
								origin: "record",
								issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
								input: key,
								path: [key],
								inst
							});
							continue;
						}
						const result = def.valueType._zod.run({
							value: input[key],
							issues: []
						}, ctx);
						if (result instanceof Promise) proms.push(result.then((result) => {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[keyResult.value] = result.value;
						}));
						else {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[keyResult.value] = result.value;
						}
					}
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
			$ZodType.init(inst, def);
			const values = getEnumValues(def.entries);
			const valuesSet = new Set(values);
			inst._zod.values = valuesSet;
			inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (valuesSet.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
			$ZodType.init(inst, def);
			if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
			const values = new Set(def.values);
			inst._zod.values = values;
			inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (values.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values: def.values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				const _out = def.transform(payload.value, payload);
				if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				if (_out instanceof Promise) throw new $ZodAsyncError();
				payload.value = _out;
				payload.fallback = true;
				return payload;
			};
		});
		function handleOptionalResult(result, input) {
			if (input === void 0 && (result.issues.length || result.fallback)) return {
				issues: [],
				value: void 0
			};
			return result;
		}
		const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.optout = "optional";
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
			});
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (def.innerType._zod.optin === "optional") {
					const input = payload.value;
					const result = def.innerType._zod.run(payload, ctx);
					if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
					return handleOptionalResult(result, input);
				}
				if (payload.value === void 0) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
			inst._zod.parse = (payload, ctx) => {
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
			});
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (payload.value === null) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) {
					payload.value = def.defaultValue;
					/**
					* $ZodDefault returns the default value immediately in forward direction.
					* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
					return payload;
				}
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
				return handleDefaultResult(result, def);
			};
		});
		function handleDefaultResult(payload, def) {
			if (payload.value === void 0) payload.value = def.defaultValue;
			return payload;
		}
		const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) payload.value = def.defaultValue;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => {
				const v = def.innerType._zod.values;
				return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
				return handleNonOptionalResult(result, inst);
			};
		});
		function handleNonOptionalResult(payload, inst) {
			if (!payload.issues.length && payload.value === void 0) payload.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: payload.value,
				inst
			});
			return payload;
		}
		const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => {
					payload.value = result.value;
					if (result.issues.length) {
						payload.value = def.catchValue({
							...payload,
							error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
							input: payload.value
						});
						payload.issues = [];
						payload.fallback = true;
					}
					return payload;
				});
				payload.value = result.value;
				if (result.issues.length) {
					payload.value = def.catchValue({
						...payload,
						error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
						input: payload.value
					});
					payload.issues = [];
					payload.fallback = true;
				}
				return payload;
			};
		});
		const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => def.in._zod.values);
			defineLazy(inst._zod, "optin", () => def.in._zod.optin);
			defineLazy(inst._zod, "optout", () => def.out._zod.optout);
			defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") {
					const right = def.out._zod.run(payload, ctx);
					if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
					return handlePipeResult(right, def.in, ctx);
				}
				const left = def.in._zod.run(payload, ctx);
				if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
				return handlePipeResult(left, def.out, ctx);
			};
		});
		function handlePipeResult(left, next, ctx) {
			if (left.issues.length) {
				left.aborted = true;
				return left;
			}
			return next._zod.run({
				value: left.value,
				issues: left.issues,
				fallback: left.fallback
			}, ctx);
		}
		const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
			defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then(handleReadonlyResult);
				return handleReadonlyResult(result);
			};
		});
		function handleReadonlyResult(payload) {
			payload.value = Object.freeze(payload.value);
			return payload;
		}
		const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
			$ZodCheck.init(inst, def);
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _) => {
				return payload;
			};
			inst._zod.check = (payload) => {
				const input = payload.value;
				const r = def.fn(input);
				if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
				handleRefineResult(r, payload, input, inst);
			};
		});
		function handleRefineResult(result, payload, input, inst) {
			if (!result) {
				const _iss = {
					code: "custom",
					input,
					inst,
					path: [...inst._zod.def.path ?? []],
					continue: !inst._zod.def.abort
				};
				if (inst._zod.def.params) _iss.params = inst._zod.def.params;
				payload.issues.push(issue(_iss));
			}
		}
		//#endregion
		//#region node_modules/zod/v4/core/registries.js
		var _a;
		var $ZodRegistry = class {
			constructor() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
			}
			add(schema, ..._meta) {
				const meta = _meta[0];
				this._map.set(schema, meta);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
				return this;
			}
			clear() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
				return this;
			}
			remove(schema) {
				const meta = this._map.get(schema);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
				this._map.delete(schema);
				return this;
			}
			get(schema) {
				const p = schema._zod.parent;
				if (p) {
					const pm = { ...this.get(p) ?? {} };
					delete pm.id;
					const f = {
						...pm,
						...this._map.get(schema)
					};
					return Object.keys(f).length ? f : void 0;
				}
				return this._map.get(schema);
			}
			has(schema) {
				return this._map.has(schema);
			}
		};
		function registry() {
			return new $ZodRegistry();
		}
		(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
		const globalRegistry = globalThis.__zod_globalRegistry;
		//#endregion
		//#region node_modules/zod/v4/core/api.js
		// @__NO_SIDE_EFFECTS__
		function _string(Class, params) {
			return new Class({
				type: "string",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _email(Class, params) {
			return new Class({
				type: "string",
				format: "email",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _guid(Class, params) {
			return new Class({
				type: "string",
				format: "guid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuid(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv4(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v4",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv6(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v6",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv7(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v7",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _url(Class, params) {
			return new Class({
				type: "string",
				format: "url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _emoji(Class, params) {
			return new Class({
				type: "string",
				format: "emoji",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _nanoid(Class, params) {
			return new Class({
				type: "string",
				format: "nanoid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link _cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		// @__NO_SIDE_EFFECTS__
		function _cuid(Class, params) {
			return new Class({
				type: "string",
				format: "cuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cuid2(Class, params) {
			return new Class({
				type: "string",
				format: "cuid2",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ulid(Class, params) {
			return new Class({
				type: "string",
				format: "ulid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _xid(Class, params) {
			return new Class({
				type: "string",
				format: "xid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ksuid(Class, params) {
			return new Class({
				type: "string",
				format: "ksuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv4(Class, params) {
			return new Class({
				type: "string",
				format: "ipv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv6(Class, params) {
			return new Class({
				type: "string",
				format: "ipv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv4(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv6(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64(Class, params) {
			return new Class({
				type: "string",
				format: "base64",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64url(Class, params) {
			return new Class({
				type: "string",
				format: "base64url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _e164(Class, params) {
			return new Class({
				type: "string",
				format: "e164",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _jwt(Class, params) {
			return new Class({
				type: "string",
				format: "jwt",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDateTime(Class, params) {
			return new Class({
				type: "string",
				format: "datetime",
				check: "string_format",
				offset: false,
				local: false,
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDate(Class, params) {
			return new Class({
				type: "string",
				format: "date",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoTime(Class, params) {
			return new Class({
				type: "string",
				format: "time",
				check: "string_format",
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDuration(Class, params) {
			return new Class({
				type: "string",
				format: "duration",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _number(Class, params) {
			return new Class({
				type: "number",
				checks: [],
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _int(Class, params) {
			return new Class({
				type: "number",
				check: "number_format",
				abort: false,
				format: "safeint",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _boolean(Class, params) {
			return new Class({
				type: "boolean",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _null$1(Class, params) {
			return new Class({
				type: "null",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _unknown(Class) {
			return new Class({ type: "unknown" });
		}
		// @__NO_SIDE_EFFECTS__
		function _never(Class, params) {
			return new Class({
				type: "never",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lt(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lte(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gt(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gte(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _multipleOf(value, params) {
			return new $ZodCheckMultipleOf({
				check: "multiple_of",
				...normalizeParams(params),
				value
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _maxLength(maximum, params) {
			return new $ZodCheckMaxLength({
				check: "max_length",
				...normalizeParams(params),
				maximum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _minLength(minimum, params) {
			return new $ZodCheckMinLength({
				check: "min_length",
				...normalizeParams(params),
				minimum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _length(length, params) {
			return new $ZodCheckLengthEquals({
				check: "length_equals",
				...normalizeParams(params),
				length
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _regex(pattern, params) {
			return new $ZodCheckRegex({
				check: "string_format",
				format: "regex",
				...normalizeParams(params),
				pattern
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lowercase(params) {
			return new $ZodCheckLowerCase({
				check: "string_format",
				format: "lowercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uppercase(params) {
			return new $ZodCheckUpperCase({
				check: "string_format",
				format: "uppercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _includes(includes, params) {
			return new $ZodCheckIncludes({
				check: "string_format",
				format: "includes",
				...normalizeParams(params),
				includes
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _startsWith(prefix, params) {
			return new $ZodCheckStartsWith({
				check: "string_format",
				format: "starts_with",
				...normalizeParams(params),
				prefix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _endsWith(suffix, params) {
			return new $ZodCheckEndsWith({
				check: "string_format",
				format: "ends_with",
				...normalizeParams(params),
				suffix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _overwrite(tx) {
			return new $ZodCheckOverwrite({
				check: "overwrite",
				tx
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _normalize(form) {
			return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
		}
		// @__NO_SIDE_EFFECTS__
		function _trim() {
			return /* @__PURE__ */ _overwrite((input) => input.trim());
		}
		// @__NO_SIDE_EFFECTS__
		function _toLowerCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _toUpperCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _slugify() {
			return /* @__PURE__ */ _overwrite((input) => slugify(input));
		}
		// @__NO_SIDE_EFFECTS__
		function _array(Class, element, params) {
			return new Class({
				type: "array",
				element,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _refine(Class, fn, _params) {
			return new Class({
				type: "custom",
				check: "custom",
				fn,
				...normalizeParams(_params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _superRefine(fn, params) {
			const ch = /* @__PURE__ */ _check((payload) => {
				payload.addIssue = (issue$2) => {
					if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
					else {
						const _issue = issue$2;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = ch);
						_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
						payload.issues.push(issue(_issue));
					}
				};
				return fn(payload.value, payload);
			}, params);
			return ch;
		}
		// @__NO_SIDE_EFFECTS__
		function _check(fn, params) {
			const ch = new $ZodCheck({
				check: "custom",
				...normalizeParams(params)
			});
			ch._zod.check = fn;
			return ch;
		}
		//#endregion
		//#region node_modules/zod/v4/core/to-json-schema.js
		function initializeContext(params) {
			let target = params?.target ?? "draft-2020-12";
			if (target === "draft-4") target = "draft-04";
			if (target === "draft-7") target = "draft-07";
			return {
				processors: params.processors ?? {},
				metadataRegistry: params?.metadata ?? globalRegistry,
				target,
				unrepresentable: params?.unrepresentable ?? "throw",
				override: params?.override ?? (() => {}),
				io: params?.io ?? "output",
				counter: 0,
				seen: /* @__PURE__ */ new Map(),
				cycles: params?.cycles ?? "ref",
				reused: params?.reused ?? "inline",
				external: params?.external ?? void 0
			};
		}
		function process(schema, ctx, _params = {
			path: [],
			schemaPath: []
		}) {
			var _a;
			const def = schema._zod.def;
			const seen = ctx.seen.get(schema);
			if (seen) {
				seen.count++;
				if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
				return seen.schema;
			}
			const result = {
				schema: {},
				count: 1,
				cycle: void 0,
				path: _params.path
			};
			ctx.seen.set(schema, result);
			const overrideSchema = schema._zod.toJSONSchema?.();
			if (overrideSchema) result.schema = overrideSchema;
			else {
				const params = {
					..._params,
					schemaPath: [..._params.schemaPath, schema],
					path: _params.path
				};
				if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
				else {
					const _json = result.schema;
					const processor = ctx.processors[def.type];
					if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
					processor(schema, ctx, _json, params);
				}
				const parent = schema._zod.parent;
				if (parent) {
					if (!result.ref) result.ref = parent;
					process(parent, ctx, params);
					ctx.seen.get(parent).isParent = true;
				}
			}
			const meta = ctx.metadataRegistry.get(schema);
			if (meta) Object.assign(result.schema, meta);
			if (ctx.io === "input" && isTransforming(schema)) {
				delete result.schema.examples;
				delete result.schema.default;
			}
			if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
			delete result.schema._prefault;
			return ctx.seen.get(schema).schema;
		}
		function extractDefs(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const idToSchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.entries()) {
				const id = ctx.metadataRegistry.get(entry[0])?.id;
				if (id) {
					const existing = idToSchema.get(id);
					if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
					idToSchema.set(id, entry[0]);
				}
			}
			const makeURI = (entry) => {
				const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
				if (ctx.external) {
					const externalId = ctx.external.registry.get(entry[0])?.id;
					const uriGenerator = ctx.external.uri ?? ((id) => id);
					if (externalId) return { ref: uriGenerator(externalId) };
					const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
					entry[1].defId = id;
					return {
						defId: id,
						ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
					};
				}
				if (entry[1] === root) return { ref: "#" };
				const defUriPrefix = `#/${defsSegment}/`;
				const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
				return {
					defId,
					ref: defUriPrefix + defId
				};
			};
			const extractToDef = (entry) => {
				if (entry[1].schema.$ref) return;
				const seen = entry[1];
				const { ref, defId } = makeURI(entry);
				seen.def = { ...seen.schema };
				if (defId) seen.defId = defId;
				const schema = seen.schema;
				for (const key in schema) delete schema[key];
				schema.$ref = ref;
			};
			if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
			}
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (schema === entry[0]) {
					extractToDef(entry);
					continue;
				}
				if (ctx.external) {
					const ext = ctx.external.registry.get(entry[0])?.id;
					if (schema !== entry[0] && ext) {
						extractToDef(entry);
						continue;
					}
				}
				if (ctx.metadataRegistry.get(entry[0])?.id) {
					extractToDef(entry);
					continue;
				}
				if (seen.cycle) {
					extractToDef(entry);
					continue;
				}
				if (seen.count > 1) {
					if (ctx.reused === "ref") {
						extractToDef(entry);
						continue;
					}
				}
			}
		}
		function finalize(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const flattenRef = (zodSchema) => {
				const seen = ctx.seen.get(zodSchema);
				if (seen.ref === null) return;
				const schema = seen.def ?? seen.schema;
				const _cached = { ...schema };
				const ref = seen.ref;
				seen.ref = null;
				if (ref) {
					flattenRef(ref);
					const refSeen = ctx.seen.get(ref);
					const refSchema = refSeen.schema;
					if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
						schema.allOf = schema.allOf ?? [];
						schema.allOf.push(refSchema);
					} else Object.assign(schema, refSchema);
					Object.assign(schema, _cached);
					if (zodSchema._zod.parent === ref) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (!(key in _cached)) delete schema[key];
					}
					if (refSchema.$ref && refSeen.def) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
					}
				}
				const parent = zodSchema._zod.parent;
				if (parent && parent !== ref) {
					flattenRef(parent);
					const parentSeen = ctx.seen.get(parent);
					if (parentSeen?.schema.$ref) {
						schema.$ref = parentSeen.schema.$ref;
						if (parentSeen.def) for (const key in schema) {
							if (key === "$ref" || key === "allOf") continue;
							if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
						}
					}
				}
				ctx.override({
					zodSchema,
					jsonSchema: schema,
					path: seen.path ?? []
				});
			};
			for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
			const result = {};
			if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
			else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
			else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
			else if (ctx.target === "openapi-3.0") {}
			if (ctx.external?.uri) {
				const id = ctx.external.registry.get(schema)?.id;
				if (!id) throw new Error("Schema is missing an `id` property");
				result.$id = ctx.external.uri(id);
			}
			Object.assign(result, root.def ?? root.schema);
			const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
			if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
			const defs = ctx.external?.defs ?? {};
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.def && seen.defId) {
					if (seen.def.id === seen.defId) delete seen.def.id;
					defs[seen.defId] = seen.def;
				}
			}
			if (ctx.external) {} else if (Object.keys(defs).length > 0) {
				if (ctx.target === "draft-2020-12") result.$defs = defs;
				else result.definitions = defs;
			}
			try {
				const finalized = JSON.parse(JSON.stringify(result));
				Object.defineProperty(finalized, "~standard", {
					value: {
						...schema["~standard"],
						jsonSchema: {
							input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
							output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
						}
					},
					enumerable: false,
					writable: false
				});
				return finalized;
			} catch (_err) {
				throw new Error("Error converting schema to JSON.");
			}
		}
		function isTransforming(_schema, _ctx) {
			const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
			if (ctx.seen.has(_schema)) return false;
			ctx.seen.add(_schema);
			const def = _schema._zod.def;
			if (def.type === "transform") return true;
			if (def.type === "array") return isTransforming(def.element, ctx);
			if (def.type === "set") return isTransforming(def.valueType, ctx);
			if (def.type === "lazy") return isTransforming(def.getter(), ctx);
			if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
			if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
			if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
			if (def.type === "pipe") {
				if (_schema._zod.traits.has("$ZodCodec")) return true;
				return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
			}
			if (def.type === "object") {
				for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
				return false;
			}
			if (def.type === "union") {
				for (const option of def.options) if (isTransforming(option, ctx)) return true;
				return false;
			}
			if (def.type === "tuple") {
				for (const item of def.items) if (isTransforming(item, ctx)) return true;
				if (def.rest && isTransforming(def.rest, ctx)) return true;
				return false;
			}
			return false;
		}
		/**
		* Creates a toJSONSchema method for a schema instance.
		* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
		*/
		const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
			const ctx = initializeContext({
				...params,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
			const { libraryOptions, target } = params ?? {};
			const ctx = initializeContext({
				...libraryOptions ?? {},
				target,
				io,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		//#endregion
		//#region node_modules/zod/v4/core/json-schema-processors.js
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const stringProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			json.type = "string";
			const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
			if (typeof minimum === "number") json.minLength = minimum;
			if (typeof maximum === "number") json.maxLength = maximum;
			if (format) {
				json.format = formatMap[format] ?? format;
				if (json.format === "") delete json.format;
				if (format === "time") delete json.format;
			}
			if (contentEncoding) json.contentEncoding = contentEncoding;
			if (patterns && patterns.size > 0) {
				const regexes = [...patterns];
				if (regexes.length === 1) json.pattern = regexes[0].source;
				else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
					...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
					pattern: regex.source
				}))];
			}
		};
		const numberProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
			if (typeof format === "string" && format.includes("int")) json.type = "integer";
			else json.type = "number";
			const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
			const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
			const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
			if (exMin) {
				if (legacy) {
					json.minimum = exclusiveMinimum;
					json.exclusiveMinimum = true;
				} else json.exclusiveMinimum = exclusiveMinimum;
			} else if (typeof minimum === "number") json.minimum = minimum;
			if (exMax) {
				if (legacy) {
					json.maximum = exclusiveMaximum;
					json.exclusiveMaximum = true;
				} else json.exclusiveMaximum = exclusiveMaximum;
			} else if (typeof maximum === "number") json.maximum = maximum;
			if (typeof multipleOf === "number") json.multipleOf = multipleOf;
		};
		const booleanProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const nullProcessor = (_schema, ctx, json, _params) => {
			if (ctx.target === "openapi-3.0") {
				json.type = "string";
				json.nullable = true;
				json.enum = [null];
			} else json.type = "null";
		};
		const neverProcessor = (_schema, _ctx, json, _params) => {
			json.not = {};
		};
		const enumProcessor = (schema, _ctx, json, _params) => {
			const def = schema._zod.def;
			const values = getEnumValues(def.entries);
			if (values.every((v) => typeof v === "number")) json.type = "number";
			if (values.every((v) => typeof v === "string")) json.type = "string";
			json.enum = values;
		};
		const literalProcessor = (schema, ctx, json, _params) => {
			const def = schema._zod.def;
			const vals = [];
			for (const val of def.values) if (val === void 0) {
				if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
			} else if (typeof val === "bigint") {
				if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
				else vals.push(Number(val));
			} else vals.push(val);
			if (vals.length === 0) {} else if (vals.length === 1) {
				const val = vals[0];
				json.type = val === null ? "null" : typeof val;
				if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
				else json.const = val;
			} else {
				if (vals.every((v) => typeof v === "number")) json.type = "number";
				if (vals.every((v) => typeof v === "string")) json.type = "string";
				if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
				if (vals.every((v) => v === null)) json.type = "null";
				json.enum = vals;
			}
		};
		const customProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
		};
		const transformProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
		};
		const arrayProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
			json.type = "array";
			json.items = process(def.element, ctx, {
				...params,
				path: [...params.path, "items"]
			});
		};
		const objectProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			json.properties = {};
			const shape = def.shape;
			for (const key in shape) json.properties[key] = process(shape[key], ctx, {
				...params,
				path: [
					...params.path,
					"properties",
					key
				]
			});
			const allKeys = new Set(Object.keys(shape));
			const requiredKeys = new Set([...allKeys].filter((key) => {
				const v = def.shape[key]._zod;
				if (ctx.io === "input") return v.optin === void 0;
				else return v.optout === void 0;
			}));
			if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
			if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
			else if (!def.catchall) {
				if (ctx.io === "output") json.additionalProperties = false;
			} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
				...params,
				path: [...params.path, "additionalProperties"]
			});
		};
		const unionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const isExclusive = def.inclusive === false;
			const options = def.options.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					isExclusive ? "oneOf" : "anyOf",
					i
				]
			}));
			if (isExclusive) json.oneOf = options;
			else json.anyOf = options;
		};
		const intersectionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const a = process(def.left, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					0
				]
			});
			const b = process(def.right, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					1
				]
			});
			const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
			json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
		};
		const recordProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			const keyType = def.keyType;
			const patterns = keyType._zod.bag?.patterns;
			if (def.mode === "loose" && patterns && patterns.size > 0) {
				const valueSchema = process(def.valueType, ctx, {
					...params,
					path: [
						...params.path,
						"patternProperties",
						"*"
					]
				});
				json.patternProperties = {};
				for (const pattern of patterns) json.patternProperties[pattern.source] = valueSchema;
			} else {
				if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") json.propertyNames = process(def.keyType, ctx, {
					...params,
					path: [...params.path, "propertyNames"]
				});
				json.additionalProperties = process(def.valueType, ctx, {
					...params,
					path: [...params.path, "additionalProperties"]
				});
			}
			const keyValues = keyType._zod.values;
			if (keyValues) {
				const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
				if (validKeyValues.length > 0) json.required = validKeyValues;
			}
		};
		const nullableProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const inner = process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			if (ctx.target === "openapi-3.0") {
				seen.ref = def.innerType;
				json.nullable = true;
			} else json.anyOf = [inner, { type: "null" }];
		};
		const nonoptionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const defaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.default = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const prefaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const catchProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			let catchValue;
			try {
				catchValue = def.catchValue(void 0);
			} catch {
				throw new Error("Dynamic catch values are not supported in JSON Schema");
			}
			json.default = catchValue;
		};
		const pipeProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			const inIsTransform = def.in._zod.traits.has("$ZodTransform");
			const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const readonlyProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.readOnly = true;
		};
		const optionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		//#endregion
		//#region node_modules/zod/v4/classic/iso.js
		const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
			$ZodISODateTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function datetime(params) {
			return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
		}
		const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
			$ZodISODate.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function date(params) {
			return /* @__PURE__ */ _isoDate(ZodISODate, params);
		}
		const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
			$ZodISOTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function time(params) {
			return /* @__PURE__ */ _isoTime(ZodISOTime, params);
		}
		const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
			$ZodISODuration.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function duration(params) {
			return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
		}
		//#endregion
		//#region node_modules/zod/v4/classic/errors.js
		const initializer = (inst, issues) => {
			$ZodError.init(inst, issues);
			inst.name = "ZodError";
			Object.defineProperties(inst, {
				format: { value: (mapper) => formatError(inst, mapper) },
				flatten: { value: (mapper) => flattenError(inst, mapper) },
				addIssue: { value: (issue) => {
					inst.issues.push(issue);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				addIssues: { value: (issues) => {
					inst.issues.push(...issues);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				isEmpty: { get() {
					return inst.issues.length === 0;
				} }
			});
		};
		const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });
		//#endregion
		//#region node_modules/zod/v4/classic/parse.js
		const parse = /* @__PURE__ */ _parse(ZodRealError);
		const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
		const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
		const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
		const encode = /* @__PURE__ */ _encode(ZodRealError);
		const decode = /* @__PURE__ */ _decode(ZodRealError);
		const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
		const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
		const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
		const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
		const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
		const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
		//#endregion
		//#region node_modules/zod/v4/classic/schemas.js
		const _installedGroups = /* @__PURE__ */ new WeakMap();
		function _installLazyMethods(inst, group, methods) {
			const proto = Object.getPrototypeOf(inst);
			let installed = _installedGroups.get(proto);
			if (!installed) {
				installed = /* @__PURE__ */ new Set();
				_installedGroups.set(proto, installed);
			}
			if (installed.has(group)) return;
			installed.add(group);
			for (const key in methods) {
				const fn = methods[key];
				Object.defineProperty(proto, key, {
					configurable: true,
					enumerable: false,
					get() {
						const bound = fn.bind(this);
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: bound
						});
						return bound;
					},
					set(v) {
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: v
						});
					}
				});
			}
		}
		const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
			$ZodType.init(inst, def);
			Object.assign(inst["~standard"], { jsonSchema: {
				input: createStandardJSONSchemaMethod(inst, "input"),
				output: createStandardJSONSchemaMethod(inst, "output")
			} });
			inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
			inst.def = def;
			inst.type = def.type;
			Object.defineProperty(inst, "_def", { value: def });
			inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
			inst.safeParse = (data, params) => safeParse(inst, data, params);
			inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
			inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
			inst.spa = inst.safeParseAsync;
			inst.encode = (data, params) => encode(inst, data, params);
			inst.decode = (data, params) => decode(inst, data, params);
			inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
			inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
			inst.safeEncode = (data, params) => safeEncode(inst, data, params);
			inst.safeDecode = (data, params) => safeDecode(inst, data, params);
			inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
			inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
			_installLazyMethods(inst, "ZodType", {
				check(...chks) {
					const def = this.def;
					return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
						check: ch,
						def: { check: "custom" },
						onattach: []
					} } : ch)] }), { parent: true });
				},
				with(...chks) {
					return this.check(...chks);
				},
				clone(def, params) {
					return clone(this, def, params);
				},
				brand() {
					return this;
				},
				register(reg, meta) {
					reg.add(this, meta);
					return this;
				},
				refine(check, params) {
					return this.check(refine(check, params));
				},
				superRefine(refinement, params) {
					return this.check(superRefine(refinement, params));
				},
				overwrite(fn) {
					return this.check(/* @__PURE__ */ _overwrite(fn));
				},
				optional() {
					return optional(this);
				},
				exactOptional() {
					return exactOptional(this);
				},
				nullable() {
					return nullable(this);
				},
				nullish() {
					return optional(nullable(this));
				},
				nonoptional(params) {
					return nonoptional(this, params);
				},
				array() {
					return array(this);
				},
				or(arg) {
					return union([this, arg]);
				},
				and(arg) {
					return intersection(this, arg);
				},
				transform(tx) {
					return pipe(this, transform(tx));
				},
				default(d) {
					return _default(this, d);
				},
				prefault(d) {
					return prefault(this, d);
				},
				catch(params) {
					return _catch(this, params);
				},
				pipe(target) {
					return pipe(this, target);
				},
				readonly() {
					return readonly(this);
				},
				describe(description) {
					const cl = this.clone();
					globalRegistry.add(cl, { description });
					return cl;
				},
				meta(...args) {
					if (args.length === 0) return globalRegistry.get(this);
					const cl = this.clone();
					globalRegistry.add(cl, args[0]);
					return cl;
				},
				isOptional() {
					return this.safeParse(void 0).success;
				},
				isNullable() {
					return this.safeParse(null).success;
				},
				apply(fn) {
					return fn(this);
				}
			});
			Object.defineProperty(inst, "description", {
				get() {
					return globalRegistry.get(inst)?.description;
				},
				configurable: true
			});
			return inst;
		});
		/** @internal */
		const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
			const bag = inst._zod.bag;
			inst.format = bag.format ?? null;
			inst.minLength = bag.minimum ?? null;
			inst.maxLength = bag.maximum ?? null;
			_installLazyMethods(inst, "_ZodString", {
				regex(...args) {
					return this.check(/* @__PURE__ */ _regex(...args));
				},
				includes(...args) {
					return this.check(/* @__PURE__ */ _includes(...args));
				},
				startsWith(...args) {
					return this.check(/* @__PURE__ */ _startsWith(...args));
				},
				endsWith(...args) {
					return this.check(/* @__PURE__ */ _endsWith(...args));
				},
				min(...args) {
					return this.check(/* @__PURE__ */ _minLength(...args));
				},
				max(...args) {
					return this.check(/* @__PURE__ */ _maxLength(...args));
				},
				length(...args) {
					return this.check(/* @__PURE__ */ _length(...args));
				},
				nonempty(...args) {
					return this.check(/* @__PURE__ */ _minLength(1, ...args));
				},
				lowercase(params) {
					return this.check(/* @__PURE__ */ _lowercase(params));
				},
				uppercase(params) {
					return this.check(/* @__PURE__ */ _uppercase(params));
				},
				trim() {
					return this.check(/* @__PURE__ */ _trim());
				},
				normalize(...args) {
					return this.check(/* @__PURE__ */ _normalize(...args));
				},
				toLowerCase() {
					return this.check(/* @__PURE__ */ _toLowerCase());
				},
				toUpperCase() {
					return this.check(/* @__PURE__ */ _toUpperCase());
				},
				slugify() {
					return this.check(/* @__PURE__ */ _slugify());
				}
			});
		});
		const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			_ZodString.init(inst, def);
			inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
			inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
			inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
			inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
			inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
			inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
			inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
			inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
			inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
			inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
			inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
			inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
			inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
			inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
			inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
			inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
			inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
			inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
			inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
			inst.datetime = (params) => inst.check(datetime(params));
			inst.date = (params) => inst.check(date(params));
			inst.time = (params) => inst.check(time(params));
			inst.duration = (params) => inst.check(duration(params));
		});
		function string(params) {
			return /* @__PURE__ */ _string(ZodString, params);
		}
		const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			_ZodString.init(inst, def);
		});
		const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
			$ZodEmail.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
			$ZodGUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
			$ZodUUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
			$ZodURL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
			$ZodEmoji.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
			$ZodNanoID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
			$ZodCUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
			$ZodCUID2.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
			$ZodULID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
			$ZodXID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
			$ZodKSUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
			$ZodIPv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
			$ZodIPv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
			$ZodCIDRv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
			$ZodCIDRv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
			$ZodBase64.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
			$ZodBase64URL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
			$ZodE164.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
			$ZodJWT.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
			$ZodNumber.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
			_installLazyMethods(inst, "ZodNumber", {
				gt(value, params) {
					return this.check(/* @__PURE__ */ _gt(value, params));
				},
				gte(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				min(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				lt(value, params) {
					return this.check(/* @__PURE__ */ _lt(value, params));
				},
				lte(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				max(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				int(params) {
					return this.check(int(params));
				},
				safe(params) {
					return this.check(int(params));
				},
				positive(params) {
					return this.check(/* @__PURE__ */ _gt(0, params));
				},
				nonnegative(params) {
					return this.check(/* @__PURE__ */ _gte(0, params));
				},
				negative(params) {
					return this.check(/* @__PURE__ */ _lt(0, params));
				},
				nonpositive(params) {
					return this.check(/* @__PURE__ */ _lte(0, params));
				},
				multipleOf(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				step(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				finite() {
					return this;
				}
			});
			const bag = inst._zod.bag;
			inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
			inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
			inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
			inst.isFinite = true;
			inst.format = bag.format ?? null;
		});
		function number(params) {
			return /* @__PURE__ */ _number(ZodNumber, params);
		}
		const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
			$ZodNumberFormat.init(inst, def);
			ZodNumber.init(inst, def);
		});
		function int(params) {
			return /* @__PURE__ */ _int(ZodNumberFormat, params);
		}
		const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
			$ZodBoolean.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
		});
		function boolean(params) {
			return /* @__PURE__ */ _boolean(ZodBoolean, params);
		}
		const ZodNull = /*@__PURE__*/ $constructor("ZodNull", (inst, def) => {
			$ZodNull.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
		});
		function _null(params) {
			return /* @__PURE__ */ _null$1(ZodNull, params);
		}
		const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
			$ZodUnknown.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => void 0;
		});
		function unknown() {
			return /* @__PURE__ */ _unknown(ZodUnknown);
		}
		const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
			$ZodNever.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
		});
		function never(params) {
			return /* @__PURE__ */ _never(ZodNever, params);
		}
		const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
			$ZodArray.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
			inst.element = def.element;
			_installLazyMethods(inst, "ZodArray", {
				min(n, params) {
					return this.check(/* @__PURE__ */ _minLength(n, params));
				},
				nonempty(params) {
					return this.check(/* @__PURE__ */ _minLength(1, params));
				},
				max(n, params) {
					return this.check(/* @__PURE__ */ _maxLength(n, params));
				},
				length(n, params) {
					return this.check(/* @__PURE__ */ _length(n, params));
				},
				unwrap() {
					return this.element;
				}
			});
		});
		function array(element, params) {
			return /* @__PURE__ */ _array(ZodArray, element, params);
		}
		const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
			$ZodObjectJIT.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
			defineLazy(inst, "shape", () => {
				return def.shape;
			});
			_installLazyMethods(inst, "ZodObject", {
				keyof() {
					return _enum(Object.keys(this._zod.def.shape));
				},
				catchall(catchall) {
					return this.clone({
						...this._zod.def,
						catchall
					});
				},
				passthrough() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				loose() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				strict() {
					return this.clone({
						...this._zod.def,
						catchall: never()
					});
				},
				strip() {
					return this.clone({
						...this._zod.def,
						catchall: void 0
					});
				},
				extend(incoming) {
					return extend(this, incoming);
				},
				safeExtend(incoming) {
					return safeExtend(this, incoming);
				},
				merge(other) {
					return merge(this, other);
				},
				pick(mask) {
					return pick(this, mask);
				},
				omit(mask) {
					return omit(this, mask);
				},
				partial(...args) {
					return partial(ZodOptional, this, args[0]);
				},
				required(...args) {
					return required(ZodNonOptional, this, args[0]);
				}
			});
		});
		function object(shape, params) {
			const def = {
				type: "object",
				shape: shape ?? {},
				...normalizeParams(params)
			};
			return new ZodObject(def);
		}
		const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
			$ZodUnion.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
			inst.options = def.options;
		});
		function union(options, params) {
			return new ZodUnion({
				type: "union",
				options,
				...normalizeParams(params)
			});
		}
		const ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("ZodDiscriminatedUnion", (inst, def) => {
			ZodUnion.init(inst, def);
			$ZodDiscriminatedUnion.init(inst, def);
		});
		function discriminatedUnion(discriminator, options, params) {
			return new ZodDiscriminatedUnion({
				type: "union",
				options,
				discriminator,
				...normalizeParams(params)
			});
		}
		const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
			$ZodIntersection.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
		});
		function intersection(left, right) {
			return new ZodIntersection({
				type: "intersection",
				left,
				right
			});
		}
		const ZodRecord = /*@__PURE__*/ $constructor("ZodRecord", (inst, def) => {
			$ZodRecord.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
			inst.keyType = def.keyType;
			inst.valueType = def.valueType;
		});
		function record(keyType, valueType, params) {
			if (!valueType || !valueType._zod) return new ZodRecord({
				type: "record",
				keyType: string(),
				valueType: keyType,
				...normalizeParams(valueType)
			});
			return new ZodRecord({
				type: "record",
				keyType,
				valueType,
				...normalizeParams(params)
			});
		}
		const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
			$ZodEnum.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
			inst.enum = def.entries;
			inst.options = Object.values(def.entries);
			const keys = new Set(Object.keys(def.entries));
			inst.extract = (values, params) => {
				const newEntries = {};
				for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
			inst.exclude = (values, params) => {
				const newEntries = { ...def.entries };
				for (const value of values) if (keys.has(value)) delete newEntries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
		});
		function _enum(values, params) {
			const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
			return new ZodEnum({
				type: "enum",
				entries,
				...normalizeParams(params)
			});
		}
		const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
			$ZodLiteral.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
			inst.values = new Set(def.values);
			Object.defineProperty(inst, "value", { get() {
				if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
				return def.values[0];
			} });
		});
		function literal(value, params) {
			return new ZodLiteral({
				type: "literal",
				values: Array.isArray(value) ? value : [value],
				...normalizeParams(params)
			});
		}
		const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
			$ZodTransform.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
			inst._zod.parse = (payload, _ctx) => {
				if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				payload.addIssue = (issue$1) => {
					if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
					else {
						const _issue = issue$1;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = inst);
						payload.issues.push(issue(_issue));
					}
				};
				const output = def.transform(payload.value, payload);
				if (output instanceof Promise) return output.then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				payload.value = output;
				payload.fallback = true;
				return payload;
			};
		});
		function transform(fn) {
			return new ZodTransform({
				type: "transform",
				transform: fn
			});
		}
		const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function optional(innerType) {
			return new ZodOptional({
				type: "optional",
				innerType
			});
		}
		const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
			$ZodExactOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function exactOptional(innerType) {
			return new ZodExactOptional({
				type: "optional",
				innerType
			});
		}
		const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
			$ZodNullable.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nullable(innerType) {
			return new ZodNullable({
				type: "nullable",
				innerType
			});
		}
		const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
			$ZodDefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeDefault = inst.unwrap;
		});
		function _default(innerType, defaultValue) {
			return new ZodDefault({
				type: "default",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
			$ZodPrefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function prefault(innerType, defaultValue) {
			return new ZodPrefault({
				type: "prefault",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
			$ZodNonOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nonoptional(innerType, params) {
			return new ZodNonOptional({
				type: "nonoptional",
				innerType,
				...normalizeParams(params)
			});
		}
		const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
			$ZodCatch.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeCatch = inst.unwrap;
		});
		function _catch(innerType, catchValue) {
			return new ZodCatch({
				type: "catch",
				innerType,
				catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
			});
		}
		const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
			$ZodPipe.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
			inst.in = def.in;
			inst.out = def.out;
		});
		function pipe(in_, out) {
			return new ZodPipe({
				type: "pipe",
				in: in_,
				out
			});
		}
		const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
			$ZodReadonly.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function readonly(innerType) {
			return new ZodReadonly({
				type: "readonly",
				innerType
			});
		}
		const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
			$ZodCustom.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
		});
		function refine(fn, _params = {}) {
			return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
		}
		function superRefine(fn, params) {
			return /* @__PURE__ */ _superRefine(fn, params);
		}
		//#endregion
		//#region src/generation-contract.js
		const CLAIMS_TEMPLATE_ID = "patent-claims";
		const CLAIMS_V2_SCHEMA_VERSION = "claims-disclosure-2";
		const claimsInputVersion = (version) => version === "2" ? CLAIMS_V2_SCHEMA_VERSION : "1";
		const generationSourceSchema = _enum(["local-skill", "oasis-api"]);
		const claimsUpstreamReferenceSchema = object({
			kind: literal("project-file"),
			relativePath: string().min(1).max(1024),
			displayName: string().min(1).max(255),
			mediaType: literal("text/markdown"),
			sizeBytes: number().int().positive().max(65536),
			sha256: string().regex(/^[a-f0-9]{64}$/)
		}).strict();
		function hasPendingUnifiedRun(task) {
			return Object.values(task?.runs ?? {}).some((run) => isUnifiedRun(run) && (run.status === "prepared" || run.mode === "dsh-local" && run.status === "unknown"));
		}
		function isUnifiedRun(run) {
			return [
				"unified-fixture",
				"dsh-local",
				"oasis-api"
			].includes(run?.mode);
		}
		const generationDraftSchema = object({
			inputSchemaVersion: _enum(["1", CLAIMS_V2_SCHEMA_VERSION]),
			source: generationSourceSchema,
			upstream: claimsUpstreamReferenceSchema.optional()
		}).strict();
		const CLAIMS_FIELDS = Object.freeze([
			[
				"claims",
				"权利要求书",
				2e4,
				true
			],
			[
				"technicalField",
				"技术领域",
				12e3,
				false
			],
			[
				"background",
				"背景技术",
				12e3,
				false
			],
			[
				"benefits",
				"有益效果",
				12e3,
				false
			],
			[
				"embodiments",
				"具体实施方式",
				2e4,
				false
			],
			[
				"drawings",
				"附图说明",
				12e3,
				false
			],
			[
				"instructions",
				"用户指令",
				4e3,
				false
			]
		].map(([fieldId, label, maxChars, required]) => Object.freeze({
			fieldId,
			label,
			maxChars,
			required,
			control: "long-text",
			description: ""
		})));
		const claimsDraftValuesSchema = object(Object.fromEntries(CLAIMS_FIELDS.map((f) => [f.fieldId, string().max(f.maxChars)]))).strict();
		const CLAIMS_V2_FIELDS = Object.freeze([
			[
				"disclosure_text",
				"技术交底",
				2e4,
				true
			],
			[
				"drawings_text",
				"附图说明",
				12e3,
				false
			],
			[
				"claim_requirements_text",
				"撰写要求",
				8e3,
				false
			],
			[
				"user_input",
				"用户指令",
				4e3,
				false
			]
		].map(([fieldId, label, maxChars, required]) => Object.freeze({
			fieldId,
			label,
			maxChars,
			required,
			control: "long-text",
			description: ""
		})));
		const claimsV2DraftValuesSchema = object(Object.fromEntries(CLAIMS_V2_FIELDS.map((f) => [f.fieldId, string().max(f.maxChars)]))).strict();
		const claimsUpstreamSnapshotSchema = union([object({
			status: literal("missing"),
			reason: literal("not-connected")
		}).strict(), object({
			status: _enum(["accepted", "warning"]),
			body: string().min(1).max(24e3),
			relativePath: string().min(1).max(1024),
			sha256: string().regex(/^[a-f0-9]{64}$/),
			sourceNode: literal("Flow-1-5").nullable(),
			workflowRunUid: string().uuid().nullable(),
			generatedAt: string().max(64).nullable(),
			issues: array(string().max(128)).max(8)
		}).strict()]);
		function generationUnavailableReason(source) {
			generationSourceSchema.parse(source);
			return source === "local-skill" ? "DSH 模型服务暂不可用：请检查当前项目会话及 DSH 模型设置" : "专业 API 未启用：服务绑定待核实";
		}
		//#endregion
		//#region src/oasis-origin-policy.js
		const OASIS_PRODUCTION_HOSTNAME = "lzhxpy.oasisintwrite.com";
		function canonicalHostname(url) {
			return url.hostname.toLocaleLowerCase("en-US").replace(/\.+$/u, "");
		}
		function normalizeHttpOrigin(value, label) {
			let url;
			try {
				url = new URL(value);
			} catch {
				throw new TypeError(`${label} must be an absolute HTTP(S) origin`);
			}
			if (!["http:", "https:"].includes(url.protocol)) throw new TypeError(`${label} must use HTTP(S)`);
			if (url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) throw new TypeError(`${label} must contain only an origin`);
			url.hostname = canonicalHostname(url);
			return url;
		}
		function normalizeOasisOrigin(value, label = "origin", environmentKind = "non-production") {
			const url = normalizeHttpOrigin(value, label);
			if (!["non-production", "production"].includes(environmentKind)) throw new TypeError("Unsupported Oasis environment");
			if (environmentKind === "production") {
				if (url.origin !== `https://lzhxpy.oasisintwrite.com`) throw new TypeError("Production API must use the approved HTTPS origin");
			} else if (url.hostname === "lzhxpy.oasisintwrite.com") throw new TypeError("The Oasis production origin is forbidden");
			return url.origin;
		}
		function normalizeOasisDownloadOrigin(value, label = "download origin", environmentKind = "non-production") {
			if (environmentKind === "non-production") return normalizeOasisOrigin(value, label);
			if (environmentKind !== "production") throw new TypeError("Unsupported Oasis environment");
			const url = normalizeHttpOrigin(value, label);
			if (url.protocol !== "https:") throw new TypeError("Production files require HTTPS");
			return url.origin;
		}
		function normalizeOasisFileUrl(value, environmentKind = "non-production") {
			let url;
			try {
				if (typeof value !== "string" || value.length > 4096) throw new TypeError();
				url = new URL(value);
				normalizeOasisDownloadOrigin(url.origin, "file origin", environmentKind);
				if (url.username || url.password || url.search || url.hash) throw new TypeError();
			} catch {
				throw new TypeError("Remote file URL must satisfy the environment policy without credentials, query or fragment (non-production by default)");
			}
			return url.href;
		}
		//#endregion
		//#region src/oasis-workspace-binding.js
		const id$2 = number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
		const label = string().min(1).max(256).refine((value) => value.trim() === value);
		const workspaceApiBindingFields = {
			workspaceId: label,
			workspacePath: string().min(1).max(4096),
			environmentKind: _enum(["non-production", "production"]),
			apiBaseOrigin: string().min(1).max(2048),
			accountId: id$2,
			folderId: id$2,
			apiId: id$2,
			catalogEntryId: id$2.optional(),
			apiEndpoint: label,
			apiProcess: string().max(4e3),
			schemaHash: string().regex(/^[a-f0-9]{64}$/)
		};
		object({
			...workspaceApiBindingFields,
			expectedSettingsRevision: id$2,
			confirmed: literal(true)
		}).strict();
		const workspaceApiBindingSchema = object({
			...workspaceApiBindingFields,
			folderName: string().min(1).max(200),
			confirmedAt: string().datetime()
		}).strict().superRefine((value, ctx) => {
			try {
				if (normalizeOasisOrigin(value.apiBaseOrigin, "binding origin", value.environmentKind) !== value.apiBaseOrigin) throw new Error();
			} catch {
				ctx.addIssue({
					code: "custom",
					path: ["apiBaseOrigin"],
					message: "Invalid canonical binding origin"
				});
			}
		});
		//#endregion
		//#region src/claims-api-execution-contract.js
		const sha = string().regex(/^[a-f0-9]{64}$/);
		const id$1 = string().min(1).max(256);
		const revision = number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
		const workspaceBindingReadSchema = object({
			workspaceId: id$1,
			workspacePath: string().min(1).max(4096),
			settingsRevision: revision,
			binding: workspaceApiBindingSchema.nullable(),
			status: _enum(["unbound", "unverified"])
		}).strict();
		const workspaceBindingSavedSchema = object({
			binding: workspaceApiBindingSchema,
			status: literal("unverified")
		}).strict();
		const claimsApiSnapshotSchema = object({
			workspaceId: id$1,
			workspacePath: string().min(1).max(4096),
			taskId: id$1,
			expectedRevision: revision,
			expectedSettingsRevision: revision,
			workflowId: literal("patent-claims"),
			workflowVersion: literal("2"),
			source: literal("oasis-api"),
			binding: workspaceApiBindingSchema,
			inputSchemaVersion: literal("claims-disclosure-2"),
			values: claimsV2DraftValuesSchema,
			mapping: object({
				version: literal("claims-document-2"),
				document: object({
					fieldId: literal("Technical_Disclosure_file"),
					fileName: literal("technical-disclosure.txt"),
					mediaType: literal("text/plain;charset=utf-8"),
					byteLength: number().int().positive().max(8e4),
					sha256: sha
				}).strict(),
				textInputs: object({
					drawings_explain_TD: string().max(12e3).optional(),
					User_input: string().max(12100).optional()
				}).strict()
			}).strict(),
			allowedUploadOrigins: array(string().min(1).max(2048)).max(256)
		}).strict();
		const claimsApiPreparationSchema = object({
			status: literal("unverified"),
			canSubmit: literal(false),
			blockers: array(string().max(256)).max(16),
			snapshot: claimsApiSnapshotSchema,
			preparationSha256: sha
		}).strict();
		const claimsApiPreviewSchema = object({
			workspaceId: id$1,
			taskId: id$1,
			expectedRevision: revision,
			expectedSettingsRevision: revision,
			confirmationToken: string().uuid(),
			expiresAt: string().datetime(),
			preparationSha256: sha,
			apiBaseOrigin: string().min(1).max(2048),
			environmentKind: _enum(["non-production", "production"]),
			accountId: revision,
			folderId: revision,
			folderName: string().min(1).max(200),
			apiEndpoint: id$1,
			price: number().nonnegative().finite(),
			balance: number().nonnegative().finite(),
			documentBytes: number().int().positive().max(8e4),
			characterCount: number().int().nonnegative().max(44e3),
			mappingVersion: literal("claims-document-2")
		}).strict();
		//#endregion
		//#region src/local-run-summary.js
		const finishKinds = [
			"stop",
			"max-tokens",
			"tool-calls",
			"error",
			"aborted"
		];
		const failureStages = [
			"preparation",
			"stream",
			"result-contract"
		];
		const tokenFields = [
			"inputTokens",
			"outputTokens",
			"totalTokens",
			"cacheReadTokens",
			"reasoningTokens"
		];
		const count = number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
		const localExecutionSummarySchema = object({
			failureStage: _enum(failureStages).optional(),
			finishKind: _enum(finishKinds).optional(),
			usage: object(Object.fromEntries(tokenFields.map((key) => [key, count.optional()]))).strict().optional()
		}).strict();
		//#endregion
		//#region src/workbench-contract.js
		const WORKBENCH_LIMITS = Object.freeze({
			maxTasksPerWorkspace: 32,
			maxInputRefsPerTask: 64,
			maxRunsPerTask: 8,
			maxRemoteExecutionsPerTask: 8,
			maxWritebacksPerRun: 8,
			maxResultItems: 64,
			maxWritebackFiles: 2,
			maxReviewNoteChars: 2e3,
			maxArtifactBytes: 262144,
			maxJsonDepth: 8,
			maxJsonArrayItems: 1024,
			maxJsonObjectKeys: 256,
			maxJsonStringBytes: 262144,
			maxDraftBytes: 1048576
		});
		const textEncoder = new TextEncoder();
		function utf8Bytes(value) {
			return textEncoder.encode(value).byteLength;
		}
		const identifierSchema = string().min(1).max(256).refine((value) => value.trim() === value, "identifier must not have surrounding whitespace");
		const timestampSchema = string().refine((value) => {
			if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
			const epoch = Date.parse(value);
			return !Number.isNaN(epoch) && new Date(epoch).toISOString() === value;
		}, "must be an ISO-8601 UTC timestamp with millisecond precision");
		const sha256Schema = string().regex(/^[a-f0-9]{64}$/, "must be a lowercase SHA-256 hex digest");
		const workTypeSchema = _enum(["technical-rd", "cn-invention-patent"]);
		const workflowFieldBase = {
			fieldId: identifierSchema,
			label: string().min(1).max(200),
			description: string().max(1e3),
			required: boolean()
		};
		const workflowFormFieldSchema = union([
			object({
				...workflowFieldBase,
				control: _enum(["short-text", "long-text"]),
				maxChars: number().int().positive().max(262144)
			}).strict(),
			object({
				...workflowFieldBase,
				control: literal("string-list"),
				maxItems: number().int().positive().max(256),
				itemMaxChars: number().int().positive().max(16384)
			}).strict(),
			object({
				...workflowFieldBase,
				control: literal("select"),
				options: array(object({
					value: identifierSchema,
					label: string().min(1).max(200)
				}).strict()).min(1).max(64)
			}).strict()
		]);
		const workflowDefinitionSchema = object({
			workflowId: identifierSchema,
			workflowVersion: identifierSchema,
			workType: workTypeSchema,
			title: string().min(1).max(200),
			description: string().min(1).max(1e3),
			executionMode: _enum(["local-mock", "unified-text"]),
			materialPolicy: object({
				acceptedExtensions: array(string().regex(/^\.[a-z0-9]+$/)).max(32),
				maxFiles: number().int().positive().max(256),
				maxFileBytes: number().int().positive().max(Number.MAX_SAFE_INTEGER),
				contentReadMode: literal("metadata-only")
			}).strict(),
			outputSections: array(identifierSchema).min(1).max(64),
			form: object({ fields: array(workflowFormFieldSchema).max(64) }).strict().superRefine((value, ctx) => {
				const seen = /* @__PURE__ */ new Set();
				for (const [index, field] of value.fields.entries()) {
					if (seen.has(field.fieldId)) ctx.addIssue({
						code: "custom",
						path: [
							"fields",
							index,
							"fieldId"
						],
						message: `duplicate field id: ${field.fieldId}`
					});
					seen.add(field.fieldId);
				}
			})
		}).strict();
		const workflowCatalogResponseSchema = object({
			schemaVersion: literal(1),
			workflows: array(workflowDefinitionSchema).max(16),
			unifiedFixtureEnabled: boolean().optional(),
			apiExecutionAvailable: boolean().optional(),
			localGenerationEnabled: boolean().optional(),
			localGenerationKind: _enum(["native-offline", "native-model"]).nullable().optional()
		}).strict();
		const jsonStringSchema = string().refine((value) => utf8Bytes(value) <= WORKBENCH_LIMITS.maxJsonStringBytes, `JSON strings must not exceed ${WORKBENCH_LIMITS.maxJsonStringBytes} UTF-8 bytes`);
		const jsonPrimitiveSchema = union([
			jsonStringSchema,
			number(),
			boolean(),
			_null()
		]);
		function jsonObjectSchema(valueSchema) {
			return record(jsonStringSchema, valueSchema).superRefine((value, ctx) => {
				if (Object.keys(value).length > WORKBENCH_LIMITS.maxJsonObjectKeys) ctx.addIssue({
					code: "custom",
					message: `JSON objects must not exceed ${WORKBENCH_LIMITS.maxJsonObjectKeys} keys`
				});
			});
		}
		function createJsonValueSchema(depthRemaining) {
			if (depthRemaining === 0) return jsonPrimitiveSchema;
			const childSchema = createJsonValueSchema(depthRemaining - 1);
			return union([
				jsonPrimitiveSchema,
				array(childSchema).max(WORKBENCH_LIMITS.maxJsonArrayItems),
				jsonObjectSchema(childSchema)
			]);
		}
		const jsonRootObjectSchema = jsonObjectSchema(createJsonValueSchema(WORKBENCH_LIMITS.maxJsonDepth));
		const projectMaterialReferenceSchema = object({
			referenceId: identifierSchema,
			kind: literal("project-file"),
			relativePath: string().min(1).max(1024),
			displayName: string().min(1).max(255),
			mediaType: string().min(1).max(128),
			sizeBytes: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			sha256: sha256Schema,
			observedAt: timestampSchema,
			confirmedAt: timestampSchema
		}).strict();
		const materialReferenceSchema = discriminatedUnion("kind", [projectMaterialReferenceSchema, object({
			referenceId: identifierSchema,
			kind: literal("legacy-v1"),
			legacyValue: jsonRootObjectSchema
		}).strict()]);
		const writebackRelativePathSchema = string().min(1).max(1024).refine((value) => {
			if (value.includes("\0") || value.includes("/") || value.startsWith("\\") || /^[a-z]:/i.test(value)) return false;
			return value.split("\\").every((segment) => {
				const stem = segment.split(".")[0].replace(/[ .]+$/, "");
				return segment.length > 0 && segment.length <= 255 && segment !== "." && segment !== ".." && !/[\x00-\x1f<>:"|?*]/.test(segment) && !/[ .]$/.test(segment) && !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(stem);
			});
		}, "must be a normalized safe relative Windows path");
		const writebackFileSchema = object({
			relativePath: writebackRelativePathSchema,
			sha256: sha256Schema,
			mediaType: string().min(1).max(128)
		}).strict();
		const writebackRecordSchema = object({
			writebackId: identifierSchema,
			artifactId: identifierSchema,
			relativeDirectory: union([literal("."), writebackRelativePathSchema]),
			files: array(writebackFileSchema).length(WORKBENCH_LIMITS.maxWritebackFiles),
			reviewStatus: literal("approved"),
			committedAt: timestampSchema
		}).strict().superRefine((value, ctx) => {
			const prefix = `${value.relativeDirectory.toLocaleLowerCase("en-US")}\\`;
			const paths = /* @__PURE__ */ new Set();
			const mediaTypes = /* @__PURE__ */ new Set();
			for (const [index, file] of value.files.entries()) {
				const path = file.relativePath.toLocaleLowerCase("en-US");
				if (value.relativeDirectory === "." ? path.includes("\\") : !path.startsWith(prefix)) ctx.addIssue({
					code: "custom",
					path: [
						"files",
						index,
						"relativePath"
					],
					message: "writeback file must be inside its relative directory"
				});
				if (paths.has(path)) ctx.addIssue({
					code: "custom",
					path: [
						"files",
						index,
						"relativePath"
					],
					message: "writeback file paths must be unique"
				});
				paths.add(path);
				mediaTypes.add(file.mediaType);
			}
			if (!mediaTypes.has("text/markdown") || !mediaTypes.has("application/json")) ctx.addIssue({
				code: "custom",
				path: ["files"],
				message: "writeback must contain Markdown and JSON files"
			});
		});
		const writebackAbsolutePathSchema = string().min(1).max(32768).refine((value) => /^(?:[a-z]:\\|\\\\[^\\]+\\[^\\]+\\)/i.test(value), "must be an absolute Windows path");
		const transientWritebackFileSchema = writebackFileSchema.extend({
			absolutePath: writebackAbsolutePathSchema,
			sizeBytes: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
		}).strict();
		const writebackTransientManifestSchema = object({
			schemaVersion: literal(1),
			workspaceId: identifierSchema,
			taskId: identifierSchema,
			runId: identifierSchema,
			artifactId: identifierSchema,
			relativeDirectory: union([literal("."), writebackRelativePathSchema]),
			files: array(writebackFileSchema).length(WORKBENCH_LIMITS.maxWritebackFiles)
		}).strict().extend({
			absoluteTarget: writebackAbsolutePathSchema,
			files: array(transientWritebackFileSchema).length(WORKBENCH_LIMITS.maxWritebackFiles),
			expiresAt: timestampSchema
		}).strict().superRefine((value, ctx) => {
			const prefix = `${value.absoluteTarget.toLocaleLowerCase("en-US")}\\`;
			for (const [index, file] of value.files.entries()) if (!file.absolutePath.toLocaleLowerCase("en-US").startsWith(prefix)) ctx.addIssue({
				code: "custom",
				path: [
					"files",
					index,
					"absolutePath"
				],
				message: "manifest file must be inside its absolute target"
			});
		});
		const writebackPrepareResponseSchema = object({
			confirmationToken: string().min(1).max(512),
			manifest: writebackTransientManifestSchema
		}).strict();
		const resultSectionSchema = object({
			sectionId: identifierSchema,
			title: string().min(1).max(200),
			body: jsonStringSchema
		}).strict();
		const artifactBodySchema = string().refine((value) => utf8Bytes(value) <= WORKBENCH_LIMITS.maxArtifactBytes, `artifact body must not exceed ${WORKBENCH_LIMITS.maxArtifactBytes} UTF-8 bytes`);
		const artifactSchema = object({
			artifactId: string().regex(/^sha256:[a-f0-9]{64}$/, "artifactId must be content-addressed"),
			suggestedFileName: string().min(1).max(255),
			mediaType: literal("text/markdown"),
			body: artifactBodySchema,
			sha256: sha256Schema
		}).strict().superRefine((value, ctx) => {
			if (value.artifactId !== `sha256:${value.sha256}`) ctx.addIssue({
				code: "custom",
				path: ["artifactId"],
				message: "artifactId must match artifact sha256"
			});
		});
		const reviewSchema = object({
			status: _enum([
				"not-reviewed",
				"changes-requested",
				"approved"
			]),
			note: string().max(WORKBENCH_LIMITS.maxReviewNoteChars),
			updatedAt: timestampSchema
		}).strict();
		function enforceReviewAndWritebacks(value, ctx, { blocked = false } = {}) {
			if (blocked && value.review.status === "approved") ctx.addIssue({
				code: "custom",
				path: ["review", "status"],
				message: "blocked results cannot be approved"
			});
			if (value.review.status === "changes-requested" && value.review.note.trim().length === 0) ctx.addIssue({
				code: "custom",
				path: ["review", "note"],
				message: "changes-requested review requires a note"
			});
			for (const [index, writeback] of value.writebacks.entries()) if (writeback.artifactId !== value.result.artifact.artifactId) ctx.addIssue({
				code: "custom",
				path: [
					"writebacks",
					index,
					"artifactId"
				],
				message: "writeback artifactId must belong to the run artifact"
			});
		}
		const localRunSnapshotSchema = object({
			runId: identifierSchema,
			requestKey: identifierSchema,
			mode: literal("local-mock"),
			mockVersion: literal("1"),
			status: literal("completed"),
			workflowId: identifierSchema,
			workflowVersion: identifierSchema,
			inputSnapshot: object({
				formValues: jsonRootObjectSchema,
				inputRefs: array(projectMaterialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
				sha256: sha256Schema,
				capturedAt: timestampSchema
			}).strict(),
			result: object({
				contentStatus: _enum(["warning", "blocked"]),
				sections: array(resultSectionSchema).min(1).max(WORKBENCH_LIMITS.maxResultItems),
				risks: array(jsonStringSchema).max(WORKBENCH_LIMITS.maxResultItems),
				questions: array(jsonStringSchema).max(WORKBENCH_LIMITS.maxResultItems),
				disclaimer: string().min(1).max(4e3),
				artifact: artifactSchema
			}).strict(),
			review: reviewSchema,
			writebacks: array(writebackRecordSchema).max(WORKBENCH_LIMITS.maxWritebacksPerRun),
			createdAt: timestampSchema,
			completedAt: timestampSchema
		}).strict().superRefine((value, ctx) => {
			enforceReviewAndWritebacks(value, ctx, { blocked: value.result.contentStatus === "blocked" });
		});
		const httpUrlSchema = string().min(1).max(4096).refine((value) => {
			try {
				return ["http:", "https:"].includes(new URL(value).protocol);
			} catch {
				return false;
			}
		}, "must be an absolute HTTP(S) URL");
		function validateRemoteEnvironment(value, ctx, urls = []) {
			const environment = value.environmentKind ?? "non-production";
			try {
				if (normalizeOasisOrigin(value.apiBaseOrigin, "origin", environment) !== value.apiBaseOrigin) throw new Error();
				for (const url of urls) normalizeOasisFileUrl(url, environment);
			} catch {
				ctx.addIssue({
					code: "custom",
					message: "Invalid production/non-production origin or file URL for recorded environment"
				});
			}
		}
		const oasisRemoteExecutionStatusSchema = _enum([
			"prepared",
			"uploading",
			"ready-to-submit",
			"submitting",
			"submission-unknown",
			"waiting-result",
			"wait-stopped",
			"auth-required",
			"completed",
			"failed"
		]);
		const OASIS_REMOTE_TERMINAL_STATUSES = /* @__PURE__ */ new Set(["completed", "failed"]);
		function isOasisRemoteExecutionUnresolved(execution) {
			return !OASIS_REMOTE_TERMINAL_STATUSES.has(execution?.status);
		}
		const oasisServiceSummarySchema = object({
			categoryId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			categoryName: string().min(1).max(200),
			group: string().max(200),
			description: string().max(4e3),
			apiId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			apiEndpoint: identifierSchema,
			apiProcess: string().max(4e3),
			apiDescription: string().max(4e3)
		}).strict();
		const oasisServiceFieldSchema = object({
			fieldId: identifierSchema,
			label: string().min(1).max(200),
			description: string().max(4e3),
			type: identifierSchema,
			control: _enum([
				"short-text",
				"long-text",
				"single-file",
				"text-output",
				"file-output"
			])
		}).strict();
		const oasisProfessionalBootstrapSchema = object({
			environmentKind: _enum(["non-production", "production"]),
			remoteEnabled: boolean(),
			credentialConfigured: boolean(),
			balance: number().nonnegative().finite().nullable(),
			services: array(oasisServiceSummarySchema).max(256),
			folders: array(object({
				id: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
				name: string().min(1).max(200)
			}).strict()).max(1e3)
		}).strict();
		const workspaceBindingOptionsSchema = oasisProfessionalBootstrapSchema.extend({
			workspaceId: identifierSchema,
			workspacePath: string().min(1).max(4096),
			settingsRevision: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			accountId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			apiBaseOrigin: httpUrlSchema
		}).strict();
		const oasisProfessionalDetailSchema = object({
			id: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			name: identifierSchema,
			apiType: literal("Workflow"),
			price: number().nonnegative().finite(),
			modelName: string().max(200),
			executionMode: literal("sync"),
			inputFields: array(oasisServiceFieldSchema).max(128),
			outputFields: array(oasisServiceFieldSchema).max(128),
			schemaHash: sha256Schema
		}).strict();
		const oasisProfessionalStopResponseSchema = object({ stopped: boolean() }).strict();
		const oasisRunningWaterItemSchema = object({
			id: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			linkId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			type: string().min(1).max(100).refine((value) => value.trim().length > 0),
			money: number().finite(),
			balance: number().finite(),
			createTime: string().min(1).max(100).nullable().default(null)
		}).strict();
		object({
			total: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			items: array(oasisRunningWaterItemSchema)
		}).strict().refine((value) => value.total >= value.items.length, "total must cover the returned page");
		const oasisRunningWaterObservationSchema = object({
			status: _enum([
				"observed",
				"not-observed",
				"unverifiable"
			]),
			associationStatus: literal("unverified"),
			runId: identifierSchema,
			recordId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
			scope: literal("current-page"),
			total: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
			item: oasisRunningWaterItemSchema.nullable(),
			observedAt: timestampSchema
		}).strict().superRefine((value, ctx) => {
			if (value.status === "observed" && (value.recordId === null || value.item === null)) ctx.addIssue({
				code: "custom",
				path: ["item"],
				message: "observed running water requires one correlated item"
			});
			if (value.status === "observed" && (value.item?.linkId !== value.recordId || value.total === null || value.total < 1)) ctx.addIssue({
				code: "custom",
				path: ["item"],
				message: "observed requires a matching candidate and a nonempty page"
			});
			if (value.status === "not-observed" && (value.recordId === null || value.item !== null)) ctx.addIssue({
				code: "custom",
				path: ["item"],
				message: "not-observed running water requires a record id and no item"
			});
			if (value.status === "not-observed" && value.total === null) ctx.addIssue({
				code: "custom",
				path: ["total"],
				message: "not-observed requires a validated page total"
			});
			if (value.status === "unverifiable" && (value.recordId !== null || value.total !== null || value.item !== null)) ctx.addIssue({
				code: "custom",
				path: ["status"],
				message: "unverifiable running water cannot claim remote observations"
			});
		});
		const oasisProviderSnapshotSchema = object({
			environmentKind: _enum(["non-production", "production"]).optional(),
			accountId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
			apiBaseOrigin: httpUrlSchema,
			apiId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			catalogEntryId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
			apiEndpoint: identifierSchema,
			apiProcess: string().max(4e3),
			folderId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			price: number().nonnegative().finite()
		}).strict().superRefine((value, ctx) => validateRemoteEnvironment(value, ctx));
		const oasisRemoteExecutionSchema = object({
			unifiedClaims: claimsApiSnapshotSchema.optional(),
			environmentKind: _enum(["non-production", "production"]).optional(),
			accountId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
			executionId: identifierSchema,
			recordId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable().optional(),
			recordIdSource: literal("create").nullable().optional(),
			requestKey: identifierSchema,
			status: oasisRemoteExecutionStatusSchema,
			inputSha: sha256Schema,
			formValues: jsonRootObjectSchema,
			apiBaseOrigin: httpUrlSchema,
			serviceSnapshot: object({
				apiId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
				catalogEntryId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
				apiEndpoint: identifierSchema,
				apiProcess: string().max(4e3),
				schemaHash: sha256Schema
			}).strict(),
			folderSnapshot: object({
				folderId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
				folderName: string().min(1).max(200)
			}).strict(),
			priceSnapshot: object({
				price: number().nonnegative().finite(),
				balance: number().nonnegative().finite()
			}).strict(),
			materialSnapshots: array(projectMaterialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
			uploadedFiles: array(object({
				fieldId: identifierSchema,
				referenceId: identifierSchema,
				url: httpUrlSchema,
				sha256: sha256Schema,
				uploadedAt: timestampSchema
			}).strict()).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
			safeError: object({
				code: identifierSchema,
				message: string().min(1).max(1e3)
			}).strict().nullable(),
			createdAt: timestampSchema,
			updatedAt: timestampSchema,
			submittedAt: timestampSchema.nullable(),
			completedAt: timestampSchema.nullable()
		}).strict().superRefine((value, ctx) => {
			validateRemoteEnvironment(value, ctx, value.uploadedFiles.map((file) => file.url));
			if (value.unifiedClaims) {
				const s = value.unifiedClaims, b = s.binding;
				if (value.materialSnapshots.length || s.workspaceId !== b.workspaceId || s.workspacePath !== b.workspacePath || value.accountId !== b.accountId || value.apiBaseOrigin !== b.apiBaseOrigin || value.environmentKind !== b.environmentKind || value.folderSnapshot.folderId !== b.folderId || value.serviceSnapshot.apiId !== b.apiId || value.serviceSnapshot.apiEndpoint !== b.apiEndpoint || value.serviceSnapshot.catalogEntryId !== b.catalogEntryId || value.serviceSnapshot.apiProcess !== b.apiProcess || value.serviceSnapshot.schemaHash !== b.schemaHash || JSON.stringify(value.formValues) !== JSON.stringify(s.mapping.textInputs)) ctx.addIssue({
					code: "custom",
					message: "unified API execution snapshot mismatch"
				});
			}
			if (value.recordIdSource === "create" && !Number.isSafeInteger(value.recordId)) ctx.addIssue({
				code: "custom",
				path: ["recordId"],
				message: "create provenance requires a record id"
			});
			if (value.status === "completed") {
				if (value.completedAt === null) ctx.addIssue({
					code: "custom",
					path: ["completedAt"],
					message: "completed execution requires completedAt"
				});
				if (value.submittedAt === null) ctx.addIssue({
					code: "custom",
					path: ["submittedAt"],
					message: "completed execution requires submittedAt"
				});
				if (value.safeError !== null) ctx.addIssue({
					code: "custom",
					path: ["safeError"],
					message: "completed execution cannot retain an error"
				});
			}
			if ([
				"submission-unknown",
				"wait-stopped",
				"auth-required",
				"failed"
			].includes(value.status) && value.safeError === null) ctx.addIssue({
				code: "custom",
				path: ["safeError"],
				message: `${value.status} execution requires a safe error`
			});
		});
		const oasisRemoteRunSnapshotSchema = object({
			runId: identifierSchema,
			requestKey: identifierSchema,
			mode: literal("oasis-legacy"),
			status: literal("completed"),
			executionId: identifierSchema,
			providerSnapshot: oasisProviderSnapshotSchema,
			inputSnapshot: object({
				formValues: jsonRootObjectSchema,
				inputRefs: array(projectMaterialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
				sha256: sha256Schema,
				capturedAt: timestampSchema
			}).strict(),
			result: object({
				answerText: jsonStringSchema,
				fileUrls: array(httpUrlSchema).max(WORKBENCH_LIMITS.maxResultItems),
				fileStatus: literal("undownloaded-unverified"),
				responseSha: sha256Schema,
				artifact: artifactSchema
			}).strict(),
			review: reviewSchema,
			writebacks: array(writebackRecordSchema).max(WORKBENCH_LIMITS.maxWritebacksPerRun),
			createdAt: timestampSchema,
			completedAt: timestampSchema
		}).strict().superRefine((value, ctx) => {
			validateRemoteEnvironment(value.providerSnapshot, ctx, value.result.fileUrls);
			enforceReviewAndWritebacks(value, ctx);
		});
		const runSnapshotSchema = discriminatedUnion("mode", [localRunSnapshotSchema, oasisRemoteRunSnapshotSchema]);
		const unifiedRunSnapshotSchema = object({
			runId: identifierSchema,
			requestKey: identifierSchema,
			mode: literal("unified-fixture"),
			evidenceKind: literal("synthetic"),
			fixtureVersion: literal("1"),
			source: generationSourceSchema,
			inputSchemaVersion: _enum(["1", "claims-disclosure-2"]),
			workflowId: literal(CLAIMS_TEMPLATE_ID),
			workflowVersion: _enum(["1", "2"]),
			compositionVersion: literal("2").optional(),
			workflowRunUid: string().uuid().optional(),
			status: _enum([
				"prepared",
				"completed",
				"failed",
				"stopped"
			]),
			parentRunId: identifierSchema.nullable(),
			inputSnapshot: object({
				formValues: union([claimsDraftValuesSchema, claimsV2DraftValuesSchema]),
				inputRefs: array(never()).length(0),
				upstreamSnapshot: claimsUpstreamSnapshotSchema.optional(),
				sha256: sha256Schema,
				capturedAt: timestampSchema
			}).strict(),
			result: object({
				contentStatus: literal("warning"),
				riskAssessment: literal("not-assessed"),
				questionAssessment: literal("not-assessed"),
				artifact: artifactSchema
			}).strict().nullable(),
			review: reviewSchema,
			writebacks: array(writebackRecordSchema).max(WORKBENCH_LIMITS.maxWritebacksPerRun),
			createdAt: timestampSchema,
			completedAt: timestampSchema.nullable()
		}).strict().superRefine((run, ctx) => {
			const v2 = run.workflowVersion === "2";
			if (Boolean(run.compositionVersion) !== Boolean(run.workflowRunUid) || run.compositionVersion && !v2 || !run.compositionVersion && run.inputSnapshot.upstreamSnapshot && run.inputSnapshot.upstreamSnapshot.status !== "missing") ctx.addIssue({
				code: "custom",
				message: "cumulative composition identity mismatch"
			});
			if (run.inputSchemaVersion !== claimsInputVersion(run.workflowVersion) || !(v2 ? claimsV2DraftValuesSchema : claimsDraftValuesSchema).safeParse(run.inputSnapshot.formValues).success || v2 !== (run.inputSnapshot.upstreamSnapshot !== void 0)) ctx.addIssue({
				code: "custom",
				message: "generation input and workflow contract mismatch"
			});
			if (run.status === "completed") {
				if (run.result === null || run.completedAt === null) ctx.addIssue({
					code: "custom",
					message: "completed generation requires an artifact and completion time"
				});
				else enforceReviewAndWritebacks(run, ctx);
			} else if (run.result !== null || run.review.status !== "not-reviewed" || run.writebacks.length || run.parentRunId !== null) ctx.addIssue({
				code: "custom",
				message: "incomplete generation cannot contain result, edits, review or writebacks"
			});
			if (run.status === "prepared" !== (run.completedAt === null)) ctx.addIssue({
				code: "custom",
				message: "prepared and terminal completion time mismatch"
			});
		});
		const oasisApiRunSnapshotSchema = unifiedRunSnapshotSchema.safeExtend({
			mode: literal("oasis-api"),
			source: literal("oasis-api"),
			evidenceKind: _enum(["non-production-api", "production-api"]),
			fixtureVersion: never().optional(),
			workflowVersion: literal("2"),
			inputSchemaVersion: literal("claims-disclosure-2"),
			compositionVersion: never().optional(),
			workflowRunUid: never().optional(),
			status: literal("completed"),
			executionId: identifierSchema,
			executionInputSha: sha256Schema,
			providerSnapshot: oasisProviderSnapshotSchema,
			remoteResponse: object({
				answerText: string().min(1).max(1e5).refine((value) => value.trim().length > 0),
				fileUrls: array(httpUrlSchema).max(WORKBENCH_LIMITS.maxResultItems),
				responseSha: sha256Schema,
				fileStatus: literal("undownloaded-unverified")
			}).strict()
		}).superRefine((run, ctx) => {
			validateRemoteEnvironment(run.providerSnapshot, ctx, run.remoteResponse.fileUrls);
			if (!run.result || run.evidenceKind !== (run.providerSnapshot.environmentKind === "production" ? "production-api" : "non-production-api") || run.parentRunId === null && run.result.artifact.body !== run.remoteResponse.answerText) ctx.addIssue({
				code: "custom",
				message: "unified API result provenance mismatch"
			});
		});
		const dshLocalRunSnapshotSchema = unifiedRunSnapshotSchema.safeExtend({
			mode: literal("dsh-local"),
			source: literal("local-skill"),
			evidenceKind: _enum(["native-offline", "native-model"]),
			fixtureVersion: never().optional(),
			executionVersion: _enum(["1", "2"]),
			executionSummary: localExecutionSummarySchema.optional(),
			status: _enum([
				"prepared",
				"completed",
				"failed",
				"unknown"
			]),
			failureCode: _enum([
				"GENERATION_FAILED",
				"ABORTED",
				"TIMED_OUT",
				"INVALID_OUTPUT",
				"INVALID_INPUT",
				"MODEL_UNAVAILABLE",
				"MODEL_LIMITED",
				"INTERRUPTED"
			]).nullable(),
			contextSnapshot: object({
				sessionId: identifierSchema,
				route: object({
					provider: identifierSchema,
					model: identifierSchema,
					reasoningEffort: string().min(1).max(64).optional()
				}).strict(),
				instructionVersion: identifierSchema,
				instructionSha256: sha256Schema,
				skillProvenance: object({
					skillId: literal("flow-2-6"),
					skillVersion: _enum([
						"public-4e2-1",
						"0.2.0",
						"0.2.1",
						"0.2.2"
					]),
					inputSchemaVersion: literal("claims-disclosure-2"),
					outputSchemaVersion: literal("claims-cumulative-2"),
					executionContractVersion: literal("single-call-cumulative-1"),
					manifestSha256: sha256Schema,
					assemblySha256: sha256Schema
				}).strict().optional()
			}).strict()
		}).superRefine((run, ctx) => {
			if (run.evidenceKind === "native-model" && (run.workflowVersion !== "2" || run.compositionVersion !== "2" || ![
				"0.2.0",
				"0.2.1",
				"0.2.2"
			].includes(run.contextSnapshot.skillProvenance?.skillVersion))) ctx.addIssue({
				code: "custom",
				message: "real model requires formal contract 2 resources"
			});
			if (run.executionVersion !== run.workflowVersion || run.workflowVersion === "2" !== Boolean(run.contextSnapshot.skillProvenance) || run.contextSnapshot.skillProvenance && run.contextSnapshot.instructionSha256 !== run.contextSnapshot.skillProvenance.assemblySha256) ctx.addIssue({
				code: "custom",
				message: "local resource provenance contract mismatch"
			});
			if (["failed", "unknown"].includes(run.status) !== (run.failureCode !== null)) ctx.addIssue({
				code: "custom",
				message: "local failure requires a safe failure code"
			});
			if (run.status === "prepared" && run.executionSummary !== void 0 || run.status === "completed" && run.executionSummary?.failureStage !== void 0) ctx.addIssue({
				code: "custom",
				message: "execution summary does not match run state"
			});
		});
		const localGenerationPreviewSchema = object({
			workspaceId: identifierSchema,
			taskId: identifierSchema,
			sessionId: identifierSchema,
			expectedRevision: number().int().nonnegative(),
			sha256: sha256Schema,
			route: object({
				provider: identifierSchema,
				model: identifierSchema,
				reasoningEffort: string().min(1).max(64).optional()
			}).strict(),
			upstreamIncluded: boolean(),
			characterCount: number().int().nonnegative(),
			skill: object({
				id: literal("flow-2-6"),
				version: _enum([
					"public-4e2-1",
					"0.2.0",
					"0.2.1",
					"0.2.2"
				])
			}).strict().nullable()
		}).strict();
		const conversationDraftResponseSchema = object({
			workspaceId: identifierSchema,
			taskId: identifierSchema,
			runId: identifierSchema,
			artifactId: string().regex(/^sha256:[a-f0-9]{64}$/),
			text: string().min(1).max(15e4)
		}).strict();
		const savedFileResponseSchema = object({
			workspaceId: identifierSchema,
			taskId: identifierSchema,
			runId: identifierSchema,
			artifactId: string().regex(/^sha256:[a-f0-9]{64}$/),
			writebackId: identifierSchema,
			absolutePath: writebackAbsolutePathSchema,
			kind: literal("current-file")
		}).strict();
		const professionalDraftSchema = object({
			selectedApiEndpoint: identifierSchema,
			selectedApiId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			schemaHash: sha256Schema,
			formValues: jsonRootObjectSchema,
			folderId: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			updatedAt: timestampSchema
		}).strict();
		const workbenchEditableTaskV3Schema = object({
			taskId: identifierSchema,
			title: string().min(1).max(200),
			workType: workTypeSchema.nullable(),
			workflowId: identifierSchema.nullable(),
			workflowVersion: identifierSchema.nullable(),
			formValues: jsonRootObjectSchema,
			professionalDraft: professionalDraftSchema.nullable(),
			activeRunId: identifierSchema.nullable(),
			createdAt: timestampSchema,
			updatedAt: timestampSchema
		}).strict();
		const workbenchTaskV3Schema = object({
			taskId: identifierSchema,
			title: string().min(1).max(200),
			workType: workTypeSchema.nullable(),
			workflowId: identifierSchema.nullable(),
			workflowVersion: identifierSchema.nullable(),
			formValues: jsonRootObjectSchema,
			professionalDraft: professionalDraftSchema.nullable(),
			inputRefs: array(materialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
			activeRunId: identifierSchema.nullable(),
			runOrder: array(identifierSchema).max(WORKBENCH_LIMITS.maxRunsPerTask),
			runs: record(identifierSchema, runSnapshotSchema),
			remoteExecutionOrder: array(identifierSchema).max(WORKBENCH_LIMITS.maxRemoteExecutionsPerTask),
			remoteExecutions: record(identifierSchema, oasisRemoteExecutionSchema),
			createdAt: timestampSchema,
			updatedAt: timestampSchema
		}).strict().superRefine((value, ctx) => {
			const referenceIds = /* @__PURE__ */ new Set();
			for (const [index, reference] of value.inputRefs.entries()) {
				if (referenceIds.has(reference.referenceId)) ctx.addIssue({
					code: "custom",
					path: ["inputRefs", index],
					message: `duplicate reference id: ${reference.referenceId}`
				});
				referenceIds.add(reference.referenceId);
			}
			const seen = /* @__PURE__ */ new Set();
			for (const [index, runId] of value.runOrder.entries()) {
				if (seen.has(runId)) ctx.addIssue({
					code: "custom",
					path: ["runOrder", index],
					message: `duplicate run id: ${runId}`
				});
				seen.add(runId);
				if (!(runId in value.runs)) ctx.addIssue({
					code: "custom",
					path: ["runOrder", index],
					message: `missing run record: ${runId}`
				});
			}
			const requestKeys = /* @__PURE__ */ new Set();
			const remoteRunExecutionIds = /* @__PURE__ */ new Set();
			for (const [mapKey, run] of Object.entries(value.runs)) {
				if (!seen.has(mapKey)) ctx.addIssue({
					code: "custom",
					path: ["runs", mapKey],
					message: `orphan run record: ${mapKey}`
				});
				if (run.runId !== mapKey) ctx.addIssue({
					code: "custom",
					path: [
						"runs",
						mapKey,
						"runId"
					],
					message: `run map key does not match runId: ${mapKey}`
				});
				if (run.mode === "local-mock" && (value.workflowId !== run.workflowId || value.workflowVersion !== run.workflowVersion)) ctx.addIssue({
					code: "custom",
					path: [
						"runs",
						mapKey,
						"workflowId"
					],
					message: "run workflow must match task workflow"
				});
				if (run.mode === "oasis-legacy" || run.mode === "oasis-api") {
					const original = run.mode === "oasis-legacy" || run.parentRunId === null;
					if (original && remoteRunExecutionIds.has(run.executionId)) ctx.addIssue({
						code: "custom",
						path: [
							"runs",
							mapKey,
							"executionId"
						],
						message: "remote execution can produce only one completed run"
					});
					if (original) remoteRunExecutionIds.add(run.executionId);
					const execution = value.remoteExecutions[run.executionId];
					if (!execution || execution.status !== "completed") ctx.addIssue({
						code: "custom",
						path: [
							"runs",
							mapKey,
							"executionId"
						],
						message: "remote run requires a completed Host execution"
					});
					else {
						if (original && execution.requestKey !== run.requestKey || execution.inputSha !== (run.mode === "oasis-api" ? run.executionInputSha : run.inputSnapshot.sha256)) ctx.addIssue({
							code: "custom",
							path: [
								"runs",
								mapKey,
								"executionId"
							],
							message: "remote run must match its Host execution snapshot"
						});
						const provider = run.providerSnapshot;
						if (run.mode === "oasis-api") {
							const parent = run.parentRunId === null ? null : value.runs[run.parentRunId];
							if (!execution.unifiedClaims || execution.unifiedClaims.taskId !== value.taskId || JSON.stringify(run.inputSnapshot.formValues) !== JSON.stringify(execution.unifiedClaims.values) || run.parentRunId !== null && (!parent || parent.mode !== "oasis-api" || parent.executionId !== run.executionId || JSON.stringify(parent.remoteResponse) !== JSON.stringify(run.remoteResponse))) ctx.addIssue({
								code: "custom",
								message: "unified API run must match original execution and parent"
							});
						}
						if (execution.serviceSnapshot.apiId !== provider.apiId || execution.serviceSnapshot.catalogEntryId !== provider.catalogEntryId || execution.accountId !== provider.accountId || (execution.environmentKind ?? "non-production") !== (provider.environmentKind ?? "non-production") || execution.apiBaseOrigin !== provider.apiBaseOrigin || execution.serviceSnapshot.apiEndpoint !== provider.apiEndpoint || execution.serviceSnapshot.apiProcess !== provider.apiProcess || execution.folderSnapshot.folderId !== provider.folderId || execution.priceSnapshot.price !== provider.price) ctx.addIssue({
							code: "custom",
							path: [
								"runs",
								mapKey,
								"providerSnapshot"
							],
							message: "remote run provider must match its Host service, folder, and price snapshots"
						});
					}
				}
				if (requestKeys.has(run.requestKey)) ctx.addIssue({
					code: "custom",
					path: [
						"runs",
						mapKey,
						"requestKey"
					],
					message: `duplicate run request key: ${run.requestKey}`
				});
				requestKeys.add(run.requestKey);
			}
			if (value.activeRunId !== null && !seen.has(value.activeRunId)) ctx.addIssue({
				code: "custom",
				path: ["activeRunId"],
				message: "activeRunId must reference runOrder"
			});
			const executionIds = /* @__PURE__ */ new Set();
			const executionRequestKeys = /* @__PURE__ */ new Set();
			let inFlight = 0;
			const inFlightStatuses = /* @__PURE__ */ new Set([
				"prepared",
				"uploading",
				"ready-to-submit",
				"submitting",
				"submission-unknown",
				"waiting-result",
				"wait-stopped",
				"auth-required"
			]);
			for (const [index, executionId] of value.remoteExecutionOrder.entries()) {
				if (executionIds.has(executionId)) ctx.addIssue({
					code: "custom",
					path: ["remoteExecutionOrder", index],
					message: `duplicate remote execution id: ${executionId}`
				});
				executionIds.add(executionId);
				if (!(executionId in value.remoteExecutions)) ctx.addIssue({
					code: "custom",
					path: ["remoteExecutionOrder", index],
					message: `missing remote execution: ${executionId}`
				});
			}
			for (const [mapKey, execution] of Object.entries(value.remoteExecutions)) {
				if (!executionIds.has(mapKey)) ctx.addIssue({
					code: "custom",
					path: ["remoteExecutions", mapKey],
					message: `orphan remote execution: ${mapKey}`
				});
				if (execution.executionId !== mapKey) ctx.addIssue({
					code: "custom",
					path: [
						"remoteExecutions",
						mapKey,
						"executionId"
					],
					message: "remote execution map key must match executionId"
				});
				if (executionRequestKeys.has(execution.requestKey)) ctx.addIssue({
					code: "custom",
					path: [
						"remoteExecutions",
						mapKey,
						"requestKey"
					],
					message: `duplicate remote request key: ${execution.requestKey}`
				});
				executionRequestKeys.add(execution.requestKey);
				const uploadedFields = /* @__PURE__ */ new Set();
				for (const [index, upload] of execution.uploadedFiles.entries()) {
					if (uploadedFields.has(upload.fieldId)) ctx.addIssue({
						code: "custom",
						path: [
							"remoteExecutions",
							mapKey,
							"uploadedFiles",
							index,
							"fieldId"
						],
						message: "uploaded field ids must be unique"
					});
					uploadedFields.add(upload.fieldId);
					const reference = execution.materialSnapshots.find((item) => item.referenceId === upload.referenceId);
					const derived = execution.unifiedClaims?.mapping.document;
					const validDerived = derived && upload.fieldId === derived.fieldId && upload.referenceId === `derived-txt:${derived.sha256}` && upload.sha256 === derived.sha256;
					if (derived ? !validDerived : !reference || reference.sha256 !== upload.sha256) ctx.addIssue({
						code: "custom",
						path: [
							"remoteExecutions",
							mapKey,
							"uploadedFiles",
							index
						],
						message: "uploaded file must match its confirmed material snapshot"
					});
				}
				if (execution.status === "completed" && !remoteRunExecutionIds.has(execution.executionId)) ctx.addIssue({
					code: "custom",
					path: [
						"remoteExecutions",
						mapKey,
						"status"
					],
					message: "completed remote execution requires its completed run snapshot"
				});
				if (inFlightStatuses.has(execution.status)) inFlight += 1;
			}
			if (inFlight > 1) ctx.addIssue({
				code: "custom",
				path: ["remoteExecutions"],
				message: "concurrent unresolved remote executions are forbidden"
			});
		});
		function enforceGenerationDraft(task, ctx) {
			const claims = task.workflowId === CLAIMS_TEMPLATE_ID;
			if (!claims && task.generation !== null) ctx.addIssue({
				code: "custom",
				path: ["generation"],
				message: "legacy tasks cannot be relabeled as Skills or API"
			});
			if (claims) {
				if (task.workflowVersion !== "2" && task.generation?.upstream) ctx.addIssue({
					code: "custom",
					message: "upstream requires claims v2"
				});
				if (!["1", "2"].includes(task.workflowVersion) || task.workType !== "cn-invention-patent" || task.generation === null || task.generation?.inputSchemaVersion !== claimsInputVersion(task.workflowVersion)) ctx.addIssue({
					code: "custom",
					path: ["generation"],
					message: "claims task requires its versioned generation draft"
				});
				if (task.professionalDraft !== null) ctx.addIssue({
					code: "custom",
					path: ["professionalDraft"],
					message: "unified task cannot contain a second professional form"
				});
				if (!(task.workflowVersion === "2" ? claimsV2DraftValuesSchema : claimsDraftValuesSchema).safeParse(task.formValues).success) ctx.addIssue({
					code: "custom",
					path: ["formValues"],
					message: "claims draft requires its versioned bounded text fields"
				});
			}
			for (const [id, run] of Object.entries(task.runs ?? {})) {
				if (isUnifiedRun(run) && (run.workflowVersion !== task.workflowVersion || run.inputSchemaVersion !== task.generation?.inputSchemaVersion)) ctx.addIssue({
					code: "custom",
					path: ["runs", id],
					message: "run workflow must match task workflow"
				});
				if (isUnifiedRun(run) !== claims) ctx.addIssue({
					code: "custom",
					path: ["runs", id],
					message: "unified evidence cannot be mixed with legacy tasks or runs"
				});
				if (isUnifiedRun(run) && run.parentRunId !== null) {
					const parent = task.runs[run.parentRunId];
					if (!parent || parent.mode !== run.mode || parent.status !== "completed" || parent.source !== run.source || parent.inputSnapshot.sha256 !== run.inputSnapshot.sha256 || task.runOrder.indexOf(run.parentRunId) >= task.runOrder.indexOf(id)) ctx.addIssue({
						code: "custom",
						path: ["runs", id],
						message: "edited artifact must retain an earlier completed parent and input"
					});
				}
			}
		}
		const workbenchEditableTaskSchema = workbenchEditableTaskV3Schema.extend({ generation: generationDraftSchema.nullable() }).superRefine(enforceGenerationDraft);
		const workbenchTaskSchema = workbenchTaskV3Schema.safeExtend({
			generation: generationDraftSchema.nullable(),
			runs: record(identifierSchema, discriminatedUnion("mode", [
				localRunSnapshotSchema,
				oasisRemoteRunSnapshotSchema,
				unifiedRunSnapshotSchema,
				dshLocalRunSnapshotSchema,
				oasisApiRunSnapshotSchema
			]))
		}).superRefine(enforceGenerationDraft);
		const panelModeSchema = _enum([
			"hidden",
			"normal",
			"expanded"
		]);
		function enforceWorkspaceInvariants(value, ctx) {
			const activeTasks = Object.values(value.tasks).filter((task) => hasPendingUnifiedRun(task) || Object.values(task.remoteExecutions ?? {}).some(isOasisRemoteExecutionUnresolved));
			const pendingUnified = Object.values(value.tasks).flatMap((task) => Object.values(task.runs ?? {})).filter((run) => hasPendingUnifiedRun({ runs: { run } })).length;
			if (pendingUnified > 1 || pendingUnified && activeTasks.length > 1) ctx.addIssue({
				code: "custom",
				path: ["tasks"],
				message: "Workspace already has an active generation"
			});
			const seen = /* @__PURE__ */ new Set();
			for (const [index, taskId] of value.taskOrder.entries()) {
				if (seen.has(taskId)) ctx.addIssue({
					code: "custom",
					path: ["taskOrder", index],
					message: `duplicate task id: ${taskId}`
				});
				seen.add(taskId);
				if (!(taskId in value.tasks)) ctx.addIssue({
					code: "custom",
					path: ["taskOrder", index],
					message: `missing task record: ${taskId}`
				});
			}
			for (const [mapKey, task] of Object.entries(value.tasks)) {
				for (const execution of Object.values(task.remoteExecutions ?? {})) {
					const scope = execution.unifiedClaims;
					if (scope && (scope.taskId !== mapKey || value.workspaceId !== void 0 && scope.workspaceId !== value.workspaceId)) ctx.addIssue({
						code: "custom",
						path: ["tasks", mapKey],
						message: "API execution belongs to another Workspace or task"
					});
				}
				if (!seen.has(mapKey)) ctx.addIssue({
					code: "custom",
					path: ["tasks", mapKey],
					message: `orphan task record: ${mapKey}`
				});
				if (task.taskId !== mapKey) ctx.addIssue({
					code: "custom",
					path: [
						"tasks",
						mapKey,
						"taskId"
					],
					message: `task map key does not match taskId: ${mapKey}`
				});
			}
			if (value.activeTaskId !== null && !seen.has(value.activeTaskId)) ctx.addIssue({
				code: "custom",
				path: ["activeTaskId"],
				message: "activeTaskId must reference taskOrder"
			});
			if (Object.keys(value.tasks).length > WORKBENCH_LIMITS.maxTasksPerWorkspace) ctx.addIssue({
				code: "custom",
				path: ["tasks"],
				message: `workspace tasks must not exceed ${WORKBENCH_LIMITS.maxTasksPerWorkspace}`
			});
			if (utf8Bytes(JSON.stringify(value)) > WORKBENCH_LIMITS.maxDraftBytes) ctx.addIssue({
				code: "custom",
				message: `workspace data must not exceed ${WORKBENCH_LIMITS.maxDraftBytes} UTF-8 bytes`
			});
		}
		const editableStateFields = {
			schemaVersion: literal(3),
			panelMode: panelModeSchema,
			activeTaskId: identifierSchema.nullable(),
			taskOrder: array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
			tasks: record(identifierSchema, workbenchEditableTaskV3Schema)
		};
		const recordStateFields = {
			schemaVersion: literal(3),
			panelMode: panelModeSchema,
			activeTaskId: identifierSchema.nullable(),
			taskOrder: array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
			tasks: record(identifierSchema, workbenchTaskV3Schema)
		};
		discriminatedUnion("schemaVersion", [object(editableStateFields).strict().superRefine(enforceWorkspaceInvariants), object({
			...editableStateFields,
			schemaVersion: literal(4),
			tasks: record(identifierSchema, workbenchEditableTaskSchema)
		}).strict().superRefine(enforceWorkspaceInvariants)]);
		const workbenchRecordV3Schema = object({
			...recordStateFields,
			workspaceId: identifierSchema,
			revision: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			updatedAt: timestampSchema
		}).strict().superRefine(enforceWorkspaceInvariants);
		const workbenchRecordSchema = discriminatedUnion("schemaVersion", [workbenchRecordV3Schema, workbenchRecordV3Schema.safeExtend({
			schemaVersion: literal(4),
			tasks: record(identifierSchema, workbenchTaskSchema)
		})]);
		const workbenchTaskV2Schema = object({
			taskId: identifierSchema,
			title: string().min(1).max(200),
			workType: workTypeSchema.nullable(),
			workflowId: identifierSchema.nullable(),
			workflowVersion: identifierSchema.nullable(),
			formValues: jsonRootObjectSchema,
			inputRefs: array(materialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
			activeRunId: identifierSchema.nullable(),
			runOrder: array(identifierSchema).max(WORKBENCH_LIMITS.maxRunsPerTask),
			runs: record(identifierSchema, localRunSnapshotSchema),
			createdAt: timestampSchema,
			updatedAt: timestampSchema
		}).strict();
		const workbenchRecordV2Schema = object({
			schemaVersion: literal(2),
			workspaceId: identifierSchema,
			revision: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			panelMode: panelModeSchema,
			activeTaskId: identifierSchema.nullable(),
			taskOrder: array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
			tasks: record(identifierSchema, workbenchTaskV2Schema),
			updatedAt: timestampSchema
		}).strict().superRefine(enforceWorkspaceInvariants);
		const legacyTaskSchema = object({
			taskId: identifierSchema,
			title: string().min(1).max(200),
			workType: workTypeSchema.nullable(),
			workflowId: identifierSchema.nullable(),
			workflowVersion: identifierSchema.nullable(),
			inputRefs: array(jsonRootObjectSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
			formValues: jsonRootObjectSchema,
			run: _null(),
			preview: _null(),
			review: literal("not-reviewed"),
			createdAt: timestampSchema,
			updatedAt: timestampSchema
		}).strict();
		union([
			object({
				schemaVersion: literal(1),
				workspaceId: identifierSchema,
				revision: number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
				panelMode: panelModeSchema,
				activeTaskId: identifierSchema.nullable(),
				taskOrder: array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
				tasks: record(identifierSchema, legacyTaskSchema),
				updatedAt: timestampSchema
			}).strict().superRefine(enforceWorkspaceInvariants),
			workbenchRecordV2Schema,
			workbenchRecordSchema
		]);
		const workbenchGetResponseSchema = workbenchRecordSchema;
		const workbenchReplaceResponseSchema = discriminatedUnion("committed", [object({
			committed: literal(true),
			current: workbenchRecordSchema
		}).strict(), object({
			committed: literal(false),
			reason: literal("revision-conflict"),
			current: workbenchRecordSchema
		}).strict()]);
		const writebackCommitResponseSchema = workbenchReplaceResponseSchema;
		//#endregion
		//#region src/client/codex-icons.js
		const CODEX_PANEL_ICONS = Object.freeze({
			showHide: Object.freeze({
				viewBox: "0 0 20 20",
				transform: "translate(20 0) scale(-1 1)",
				paths: Object.freeze(["M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"])
			}),
			expand: Object.freeze({
				viewBox: "0 0 20 20",
				paths: Object.freeze(["M4.33496 11C4.33496 10.6327 4.63273 10.335 5 10.335C5.36727 10.335 5.66504 10.6327 5.66504 11V14.335H9L9.13379 14.3486C9.43692 14.4106 9.66504 14.6786 9.66504 15C9.66504 15.3214 9.43692 15.5894 9.13379 15.6514L9 15.665H5C4.63273 15.665 4.33496 15.3673 4.33496 15V11ZM14.335 9V5.66504H11C10.6327 5.66504 10.335 5.36727 10.335 5C10.335 4.63273 10.6327 4.33496 11 4.33496H15L15.1338 4.34863C15.4369 4.41057 15.665 4.67857 15.665 5V9C15.665 9.36727 15.3673 9.66504 15 9.66504C14.6327 9.66504 14.335 9.36727 14.335 9Z"])
			}),
			restore: Object.freeze({
				viewBox: "0 0 16 16",
				paths: Object.freeze(["M6.1664 8.80845C6.7325 8.80845 7.1918 9.26774 7.1918 9.83384V13.3338C7.19155 13.6236 6.9562 13.8592 6.6664 13.8592C6.37672 13.8591 6.14126 13.6235 6.14101 13.3338V10.5936L2.70547 14.0379C2.50071 14.243 2.16753 14.2435 1.9623 14.0389C1.75709 13.8342 1.75665 13.501 1.96133 13.2957L5.39101 9.85923H2.6664C2.37672 9.85909 2.14126 9.6235 2.14101 9.33384C2.14101 9.04397 2.37657 8.80858 2.6664 8.80845H6.1664Z", "M13.2943 1.96274C13.4989 1.75743 13.8311 1.75731 14.0365 1.96177C14.2419 2.16637 14.243 2.49854 14.0385 2.70395L10.6127 6.14145H13.3334C13.6233 6.14145 13.8588 6.37689 13.8588 6.66684C13.8587 6.95674 13.6233 7.19223 13.3334 7.19223H9.8334C9.26734 7.19223 8.80807 6.73288 8.80801 6.16684V2.66684C8.80801 2.37689 9.04345 2.14145 9.3334 2.14145C9.62335 2.14145 9.85879 2.37689 9.85879 2.66684V5.41098L13.2943 1.96274Z"])
			})
		});
		function CodexPanelIcon({ name, size = 18 }) {
			const icon = CODEX_PANEL_ICONS[name];
			if (!icon) throw new Error(`unknown Codex panel icon: ${name}`);
			const paths = icon.paths.map((path) => (0, react.createElement)("path", {
				key: path,
				d: path,
				fill: "currentColor"
			}));
			const body = icon.transform ? (0, react.createElement)("g", { transform: icon.transform }, paths) : paths;
			return (0, react.createElement)("svg", {
				width: size,
				height: size,
				viewBox: icon.viewBox,
				fill: "none",
				"aria-hidden": true
			}, body);
		}
		//#endregion
		//#region src/client/PanelChrome.js
		const iconButtonStyle = {
			width: 32,
			height: 32,
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			border: 0,
			borderRadius: 8,
			background: "transparent",
			color: "var(--dsw-alias-text-primary, #202123)",
			cursor: "pointer"
		};
		function IconButton({ label, icon, onClick, testId, disabled = false }) {
			return (0, react.createElement)("button", {
				type: "button",
				title: label,
				"aria-label": label,
				"data-testid": testId,
				onClick,
				disabled,
				style: {
					...iconButtonStyle,
					cursor: disabled ? "not-allowed" : "pointer",
					opacity: disabled ? .5 : 1
				}
			}, (0, react.createElement)(CodexPanelIcon, { name: icon }));
		}
		function hasUnresolvedRemoteExecution(page) {
			return hasPendingUnifiedRun(page) || page.remoteExecutionOrder?.some((executionId) => isOasisRemoteExecutionUnresolved(page.remoteExecutions?.[executionId])) === true;
		}
		function getKeyboardTabTarget(pages, pageId, key) {
			const index = pages.findIndex((page) => page.pageId === pageId);
			if (index < 0 || pages.length === 0) return null;
			if (key === "Home") return pages[0].pageId;
			if (key === "End") return pages[pages.length - 1].pageId;
			if (key === "ArrowLeft") return pages[(index - 1 + pages.length) % pages.length].pageId;
			if (key === "ArrowRight") return pages[(index + 1) % pages.length].pageId;
			if (key === "Delete") {
				if (pages.length === 1) return null;
				return pages[index + 1]?.pageId ?? pages[index - 1].pageId;
			}
			return null;
		}
		function scheduleAfterRender(callback) {
			if (typeof globalThis.requestAnimationFrame === "function") {
				globalThis.requestAnimationFrame(callback);
				return;
			}
			globalThis.queueMicrotask(callback);
		}
		function syncStatusLabel(status) {
			if (status === "loading") return "正在读取当前项目…";
			if (status === "saving") return "正在保存…";
			if (status === "ready") return "已与当前DSH项目同步";
			if (status === "conflict") return "需要解决版本冲突";
			if (status === "error") return "同步失败";
			return "等待加载当前项目";
		}
		function focusTabAfterUpdate(tabList, pageId, schedule = scheduleAfterRender) {
			schedule(() => {
				if (pageId === null) {
					tabList?.querySelector("[data-testid=\"oasis-new-page\"]")?.focus();
					return;
				}
				const targetId = `oasis-tab-${pageId}`;
				[...tabList?.querySelectorAll("[role=\"tab\"]") ?? []].find((tab) => tab.id === targetId)?.focus();
			});
		}
		function PanelChrome({ hostMode = "standalone", state, titleRef, onActivatePage, onClosePage, onCreatePage, onHide, onToggleExpanded, onOpenFunctionCenter, showFunctionCenter = false }) {
			const effectiveExpanded = state.effectiveMode === "expanded";
			const autoExpanded = state.panelMode === "normal" && effectiveExpanded;
			const operationInFlight = Object.values(state.pageOperations ?? {}).some((operation) => operation.activeOperation !== null);
			const canPersist = ["ready", "saving"].includes(state.syncStatus) && !operationInFlight;
			function moveTab(event, pageId) {
				if (!canPersist) return;
				if (![
					"ArrowLeft",
					"ArrowRight",
					"Home",
					"End",
					"Delete"
				].includes(event.key)) return;
				if (event.key === "Delete" && hasUnresolvedRemoteExecution(state.pages.find((page) => page.pageId === pageId))) {
					event.preventDefault();
					return;
				}
				const targetPageId = getKeyboardTabTarget(state.pages, pageId, event.key);
				event.preventDefault();
				if (event.key === "Delete") onClosePage(pageId);
				if (targetPageId !== null) onActivatePage(targetPageId);
				focusTabAfterUpdate(event.currentTarget.closest?.("[role=\"tablist\"]") ?? event.currentTarget.parentElement, targetPageId);
			}
			return (0, react.createElement)("header", { style: {
				flex: "0 0 auto",
				borderBottom: "1px solid var(--dsw-alias-border-l2, #e3e3e5)",
				background: "var(--dsw-alias-bg-base, #fff)"
			} }, (0, react.createElement)("div", { style: {
				minHeight: 52,
				padding: "0 12px 0 16px",
				display: "flex",
				alignItems: "center",
				gap: 10
			} }, (0, react.createElement)("div", { style: {
				minWidth: 0,
				flex: 1
			} }, (0, react.createElement)("h2", {
				ref: titleRef,
				tabIndex: -1,
				style: {
					margin: 0,
					fontSize: 15,
					lineHeight: 1.25,
					fontWeight: 650,
					outline: "none"
				}
			}, "绿洲专业工作台"), (0, react.createElement)("div", {
				role: "status",
				"aria-live": "polite",
				style: {
					marginTop: 2,
					color: "var(--dsw-alias-text-secondary, #6b7280)",
					fontSize: 11
				}
			}, `与当前DSH项目关联 · ${syncStatusLabel(state.syncStatus)}`)), ...hostMode === "embedded" ? [] : [(0, react.createElement)(IconButton, {
				key: "expand",
				label: autoExpanded ? "窗口过窄，右栏已自动展开" : effectiveExpanded ? "恢复右栏宽度" : "展开右栏",
				icon: effectiveExpanded ? "restore" : "expand",
				testId: effectiveExpanded ? "oasis-panel-restore" : "oasis-panel-expand",
				onClick: onToggleExpanded,
				disabled: autoExpanded || !canPersist
			}), (0, react.createElement)(IconButton, {
				key: "hide",
				label: "隐藏右栏",
				icon: "showHide",
				testId: "oasis-panel-hide",
				onClick: onHide
			})]), (0, react.createElement)("div", {
				role: "tablist",
				"aria-label": "绿洲任务页",
				style: {
					minHeight: 38,
					padding: "0 10px",
					display: "flex",
					alignItems: "end",
					gap: 4,
					overflowX: "auto"
				}
			}, onOpenFunctionCenter ? (0, react.createElement)("button", {
				type: "button",
				onClick: onOpenFunctionCenter,
				disabled: !canPersist,
				"aria-pressed": showFunctionCenter,
				style: {
					...iconButtonStyle,
					width: "auto",
					padding: "6px 8px",
					flexShrink: 0
				}
			}, "功能中心") : null, ...state.pages.map((page) => (0, react.createElement)("div", {
				key: page.pageId,
				role: "presentation",
				style: {
					display: "inline-flex",
					alignItems: "center",
					borderBottom: state.activePageId === page.pageId ? "2px solid #10a37f" : "2px solid transparent",
					borderRadius: "8px 8px 0 0"
				}
			}, (0, react.createElement)("button", {
				id: `oasis-tab-${page.pageId}`,
				type: "button",
				role: "tab",
				"aria-selected": state.activePageId === page.pageId,
				"aria-controls": `oasis-panel-${page.pageId}`,
				tabIndex: state.activePageId === page.pageId ? 0 : -1,
				disabled: !canPersist,
				onClick: () => onActivatePage(page.pageId),
				onKeyDown: (event) => moveTab(event, page.pageId),
				style: {
					maxWidth: 150,
					border: 0,
					background: "transparent",
					color: "var(--dsw-alias-text-primary, #202123)",
					padding: "8px 4px 7px 10px",
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
					cursor: canPersist ? "pointer" : "not-allowed"
				}
			}, page.title), (0, react.createElement)("button", {
				type: "button",
				"aria-label": `关闭任务页 ${page.title}`,
				title: `关闭任务页 ${page.title}`,
				disabled: !canPersist || hasUnresolvedRemoteExecution(page),
				onClick: () => onClosePage(page.pageId),
				style: {
					border: 0,
					background: "transparent",
					padding: "6px 7px 6px 3px",
					color: "var(--dsw-alias-text-secondary, #6b7280)",
					cursor: canPersist && !hasUnresolvedRemoteExecution(page) ? "pointer" : "not-allowed"
				}
			}, "×"))), (0, react.createElement)("button", {
				type: "button",
				title: "新建任务页",
				"aria-label": "新建任务页",
				"data-testid": "oasis-new-page",
				disabled: !canPersist,
				onClick: onCreatePage,
				style: {
					...iconButtonStyle,
					width: 30,
					height: 30,
					flex: "0 0 auto",
					fontSize: 20,
					cursor: canPersist ? "pointer" : "not-allowed",
					opacity: canPersist ? 1 : .5
				}
			}, "+")));
		}
		//#endregion
		//#region src/client/MaterialReferences.js
		function shortHash$1(hash) {
			return typeof hash === "string" && hash.length >= 8 ? `${hash.slice(0, 8)}…` : "—";
		}
		function formatBytes(bytes) {
			if (!Number.isFinite(bytes)) return "—";
			if (bytes < 1024) return `${bytes} B`;
			if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
			return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
		}
		const actionStyle = {
			border: "1px solid var(--dsw-alias-border-l2, #d7d9d8)",
			borderRadius: 7,
			padding: "6px 9px",
			background: "var(--dsw-alias-bg-base, #fff)",
			color: "var(--dsw-alias-text-primary, #1f2623)"
		};
		function MaterialReferences({ page, workflow, operation, disabled, onMaterialDraft, onAdd, onRefresh, onRemove, confirmRemove = (message) => globalThis.confirm?.(message) === true }) {
			const addDisabled = disabled || !operation.materialConfirmed || operation.materialPath.trim().length === 0;
			return (0, react.createElement)("section", { "aria-labelledby": `oasis-material-title-${page.pageId}` }, (0, react.createElement)("h4", {
				id: `oasis-material-title-${page.pageId}`,
				style: {
					margin: "0 0 5px",
					fontSize: 15
				}
			}, "项目材料"), (0, react.createElement)("p", { style: {
				margin: "0 0 12px",
				color: "var(--dsw-alias-text-secondary, #66706b)",
				fontSize: 12
			} }, `仅登记元数据与哈希；文件在本机流式读取以计算哈希，正文不提取、不持久化且不用于生成。支持 ${workflow.materialPolicy.acceptedExtensions.join("、")}。`), (0, react.createElement)("div", { style: {
				display: "grid",
				gap: 8,
				marginBottom: 12
			} }, (0, react.createElement)("label", {
				htmlFor: `oasis-material-path-${page.pageId}`,
				style: {
					fontSize: 13,
					fontWeight: 650
				}
			}, "Workspace 内相对路径"), (0, react.createElement)("input", {
				id: `oasis-material-path-${page.pageId}`,
				"aria-label": "Workspace 内材料相对路径",
				value: operation.materialPath,
				disabled,
				onChange: (event) => onMaterialDraft(event.currentTarget.value, false),
				style: {
					...actionStyle,
					width: "100%",
					boxSizing: "border-box",
					padding: "9px 10px"
				}
			}), (0, react.createElement)("label", { style: {
				display: "flex",
				gap: 8,
				alignItems: "flex-start",
				fontSize: 12
			} }, (0, react.createElement)("input", {
				type: "checkbox",
				checked: operation.materialConfirmed,
				disabled,
				onChange: (event) => onMaterialDraft(operation.materialPath, event.currentTarget.checked)
			}), (0, react.createElement)("span", null, "我确认该相对路径属于当前项目，并同意登记文件元数据与 SHA-256。")), (0, react.createElement)("button", {
				type: "button",
				disabled: addDisabled,
				onClick: onAdd,
				style: actionStyle,
				title: addDisabled ? "填写路径并勾选确认后才可登记" : void 0
			}, "登记材料")), (0, react.createElement)("div", { style: {
				display: "grid",
				gap: 8
			} }, ...page.inputRefs.map((reference) => (0, react.createElement)("article", {
				key: reference.referenceId,
				style: {
					border: "1px solid var(--dsw-alias-border-l2, #dfe2e0)",
					borderRadius: 9,
					padding: 11,
					display: "grid",
					gap: 7
				}
			}, (0, react.createElement)("strong", { style: {
				fontSize: 13,
				overflowWrap: "anywhere"
			} }, reference.displayName ?? reference.relativePath ?? "旧版材料"), reference.kind === "project-file" ? (0, react.createElement)("div", { style: {
				fontSize: 12,
				color: "var(--dsw-alias-text-secondary, #66706b)"
			} }, `${reference.relativePath} · ${formatBytes(reference.sizeBytes)} · SHA-256 ${shortHash$1(reference.sha256)}`) : (0, react.createElement)("div", { style: {
				fontSize: 12,
				color: "#9b3d2f"
			} }, "旧版材料需移除后重新确认。"), (0, react.createElement)("div", { style: {
				display: "flex",
				gap: 7
			} }, (0, react.createElement)("button", {
				type: "button",
				disabled: disabled || reference.kind !== "project-file",
				"data-testid": `oasis-material-refresh-${reference.referenceId}`,
				onClick: () => onRefresh(reference.referenceId),
				style: actionStyle
			}, "刷新证据"), (0, react.createElement)("button", {
				type: "button",
				disabled,
				"data-testid": `oasis-material-remove-${reference.referenceId}`,
				onClick: () => onRemove(reference.referenceId, confirmRemove(`确认从任务中移除材料“${reference.displayName ?? reference.referenceId}”？不会删除项目文件。`)),
				style: actionStyle
			}, "移除登记"))))), operation.error ? (0, react.createElement)("div", {
				role: "alert",
				tabIndex: -1,
				style: {
					marginTop: 10,
					color: "#9b3d2f",
					fontSize: 12
				}
			}, `操作失败（${operation.errorCode ?? "unknown"}）。本地项目文件未被删除或覆盖。`) : null, (0, react.createElement)("div", {
				role: "status",
				"aria-live": "polite",
				style: {
					marginTop: 8,
					fontSize: 12,
					color: "#2f6653"
				}
			}, operation.feedback === "material-added" ? "材料证据已登记。" : "", operation.materialsChanged ? "材料已发生变化，请刷新证据后再生成。" : ""));
		}
		//#endregion
		//#region src/client/ProfessionalServicePanel.js
		const boxStyle = {
			border: "1px solid var(--dsw-alias-border-l2, #d7d9d8)",
			borderRadius: 12,
			padding: 16,
			background: "var(--dsw-alias-bg-base, #fff)",
			display: "grid",
			gap: 12
		};
		const fieldStyle = {
			display: "grid",
			gap: 5,
			fontSize: 12
		};
		const controlStyle$1 = {
			width: "100%",
			boxSizing: "border-box",
			border: "1px solid #cfd5d1",
			borderRadius: 8,
			padding: 8
		};
		function latestExecution(page) {
			const id = page.remoteExecutionOrder.at(-1);
			return id ? page.remoteExecutions[id] : null;
		}
		function ProfessionalServicePanel({ state, page, operation, onSelectService = () => {}, onUpdateField = () => {}, onSelectFolder = () => {}, onConfirm = () => {}, onStart = () => {}, onContinue = () => {}, onStop = () => {}, onObserveRunningWater = () => {} }) {
			const configurationBlocked = state.professionalConfigurationBlocked === true;
			const waiting = ["professional-run", "professional-continue"].includes(operation.activeOperation);
			if (configurationBlocked) {
				const execution = latestExecution(page);
				return (0, react.createElement)("section", {
					style: boxStyle,
					"data-testid": "oasis-professional-service"
				}, (0, react.createElement)("strong", null, "专业服务"), (0, react.createElement)("p", { role: "status" }, "请前往 DSH 设置 → 绿洲工作台登录账户并确认项目绑定；本地工作流仍可继续使用。"), waiting && execution ? (0, react.createElement)("button", {
					type: "button",
					onClick: () => onStop(execution.executionId),
					"data-testid": "oasis-professional-stop"
				}, "停止本地等待") : null);
			}
			if (state.professionalStatus === "idle" || state.professionalStatus === "loading") return (0, react.createElement)("section", {
				style: boxStyle,
				"data-testid": "oasis-professional-service"
			}, (0, react.createElement)("strong", null, "专业服务"), (0, react.createElement)("div", { role: "status" }, "正在读取 Host 专业服务目录…"));
			if (state.professionalStatus === "error") return (0, react.createElement)("section", {
				style: boxStyle,
				"data-testid": "oasis-professional-service"
			}, (0, react.createElement)("strong", null, "专业服务"), (0, react.createElement)("div", { role: "alert" }, "专业服务目录读取失败；本地工作流仍可继续使用。"));
			const bootstrap = state.professionalBootstrap;
			if (!bootstrap?.remoteEnabled) return (0, react.createElement)("section", {
				style: boxStyle,
				"data-testid": "oasis-professional-service"
			}, (0, react.createElement)("strong", null, "专业服务"), (0, react.createElement)("p", { style: {
				margin: 0,
				color: "#66706b"
			} }, "Host 尚未启用专业 API 地址。请前往 DSH 设置 → 绿洲工作台保存，随后重启 Host 并刷新页面。"));
			if (!bootstrap.credentialConfigured) return (0, react.createElement)("section", {
				style: boxStyle,
				"data-testid": "oasis-professional-service"
			}, (0, react.createElement)("strong", null, "专业服务"), (0, react.createElement)("p", { style: {
				margin: 0,
				color: "#8b2f24"
			} }, "请前往 DSH 设置 → 绿洲工作台登录账户；登录信息不会进入工作台状态。"));
			const draft = page.professionalDraft;
			const detail = operation.professionalDetail;
			const execution = latestExecution(page);
			const busy = operation.activeOperation !== null;
			const canStart = !configurationBlocked && detail && draft && operation.priceConfirmed && operation.externalTransferConfirmed && !busy;
			const canContinue = !configurationBlocked && execution && [
				"submission-unknown",
				"waiting-result",
				"wait-stopped",
				"auth-required"
			].includes(execution.status) && !busy;
			const activeRemoteRun = page.activeRunId === null ? null : page.runs[page.activeRunId];
			const showRunningWater = activeRemoteRun?.mode === "oasis-legacy" && activeRemoteRun.status === "completed";
			const canObserveRunningWater = showRunningWater && !busy;
			const observation = operation.runningWaterObservation?.runId === activeRemoteRun?.runId ? operation.runningWaterObservation : null;
			return (0, react.createElement)("section", {
				style: boxStyle,
				"data-testid": "oasis-professional-service"
			}, (0, react.createElement)("div", null, (0, react.createElement)("strong", null, "专业服务"), (0, react.createElement)("div", { style: {
				marginTop: 4,
				color: "#66706b",
				fontSize: 12
			} }, `环境：${bootstrap.environmentKind === "production" ? "线上服务" : "非生产"} · 余额：${bootstrap.balance ?? "未知"} · 价格仅作提交前快照`)), (0, react.createElement)("label", { style: fieldStyle }, (0, react.createElement)("span", null, "服务"), (0, react.createElement)("select", {
				value: draft?.selectedApiEndpoint ?? "",
				disabled: busy,
				onChange: (event) => {
					if (event.currentTarget.value) onSelectService(event.currentTarget.value);
				},
				style: controlStyle$1,
				"data-testid": "oasis-professional-service-select"
			}, (0, react.createElement)("option", { value: "" }, "请选择服务"), ...bootstrap.services.map((service) => (0, react.createElement)("option", {
				key: service.apiEndpoint,
				value: service.apiEndpoint
			}, `${service.categoryName} / ${service.apiEndpoint}`)))), draft && !detail ? (0, react.createElement)("button", {
				type: "button",
				disabled: busy,
				onClick: () => onSelectService(draft.selectedApiEndpoint),
				"data-testid": "oasis-professional-load-detail"
			}, "加载并校验服务定义") : null, detail ? (0, react.createElement)("div", { style: {
				display: "grid",
				gap: 10
			} }, ...detail.inputFields.map((field) => (0, react.createElement)("label", {
				key: field.fieldId,
				style: fieldStyle
			}, (0, react.createElement)("span", null, field.label), field.control === "single-file" ? (0, react.createElement)("select", {
				value: draft.formValues[field.fieldId] ?? "",
				disabled: busy,
				style: controlStyle$1,
				onChange: (event) => onUpdateField(field.fieldId, event.currentTarget.value),
				"data-testid": `oasis-professional-field-${field.fieldId}`
			}, (0, react.createElement)("option", { value: "" }, "不上传文件"), ...page.inputRefs.filter((item) => item.kind === "project-file").map((reference) => (0, react.createElement)("option", {
				key: reference.referenceId,
				value: reference.referenceId
			}, reference.displayName))) : (0, react.createElement)(field.control === "long-text" ? "textarea" : "input", {
				value: draft.formValues[field.fieldId] ?? "",
				disabled: busy,
				style: controlStyle$1,
				onChange: (event) => onUpdateField(field.fieldId, event.currentTarget.value),
				"data-testid": `oasis-professional-field-${field.fieldId}`
			}))), (0, react.createElement)("label", { style: fieldStyle }, (0, react.createElement)("span", null, "项目文件夹（当前返回页）"), (0, react.createElement)("select", {
				value: draft.folderId,
				disabled: busy,
				style: controlStyle$1,
				onChange: (event) => onSelectFolder(Number(event.currentTarget.value)),
				"data-testid": "oasis-professional-folder"
			}, ...bootstrap.folders.map((folder) => (0, react.createElement)("option", {
				key: folder.id,
				value: folder.id
			}, folder.name)))), (0, react.createElement)("div", { style: { fontSize: 12 } }, `参考价格：${detail.price}`), (0, react.createElement)("label", { style: fieldStyle }, (0, react.createElement)("span", null, (0, react.createElement)("input", {
				type: "checkbox",
				checked: operation.priceConfirmed,
				disabled: busy,
				onChange: (event) => onConfirm({
					priceConfirmed: event.currentTarget.checked,
					externalTransferConfirmed: operation.externalTransferConfirmed
				})
			}), " 我已确认本次参考价格与余额快照")), (0, react.createElement)("label", { style: fieldStyle }, (0, react.createElement)("span", null, (0, react.createElement)("input", {
				type: "checkbox",
				checked: operation.externalTransferConfirmed,
				disabled: busy,
				onChange: (event) => onConfirm({
					priceConfirmed: operation.priceConfirmed,
					externalTransferConfirmed: event.currentTarget.checked
				})
			}), ` 我确认所选材料将上传至已配置的${bootstrap.environmentKind === "production" ? "线上" : "非生产"}绿洲环境`)), (0, react.createElement)("button", {
				type: "button",
				disabled: !canStart,
				onClick: onStart,
				"data-testid": "oasis-professional-start"
			}, busy ? "处理中…" : "提交专业服务")) : null, execution ? (0, react.createElement)("div", {
				role: "status",
				style: {
					borderTop: "1px solid #eceeec",
					paddingTop: 10,
					fontSize: 12
				}
			}, `执行状态：${execution.status}`, execution.safeError ? (0, react.createElement)("div", { role: "alert" }, execution.safeError.message) : null, canContinue ? (0, react.createElement)("button", {
				type: "button",
				onClick: () => onContinue(execution.executionId),
				"data-testid": "oasis-professional-continue"
			}, "继续按原请求 key 对账") : null, ["professional-run", "professional-continue"].includes(operation.activeOperation) ? (0, react.createElement)("button", {
				type: "button",
				onClick: () => onStop(execution.executionId),
				"data-testid": "oasis-professional-stop"
			}, "停止本地等待") : null) : null, showRunningWater ? (0, react.createElement)("div", { style: {
				borderTop: "1px solid #eceeec",
				paddingTop: 10,
				fontSize: 12
			} }, (0, react.createElement)("button", {
				type: "button",
				disabled: !canObserveRunningWater,
				onClick: () => onObserveRunningWater(activeRemoteRun.runId),
				"data-testid": "oasis-professional-running-water"
			}, operation.runningWaterStatus === "loading" ? "正在观察流水…" : "观察当前页流水"), (0, react.createElement)("div", { style: {
				marginTop: 6,
				color: "#66706b"
			} }, "仅表示当前页观察结果；同 link_id 仅为候选，关联未验证，不代表结算、退款或资金锁定。"), observation ? (0, react.createElement)("div", {
				role: "status",
				style: { marginTop: 6 }
			}, observation.status === "observed" ? `已观察到同 link_id 的候选流水（关联未验证）：${observation.item.type} ${observation.item.money}，余额 ${observation.item.balance}` : observation.status === "not-observed" ? "当前返回页未观察到同 link_id 候选；不能据此判断不存在或未结算。" : "没有来源已验证的创建记录 id，本次观察不可验证。") : null) : null, operation.error ? (0, react.createElement)("div", { role: "alert" }, operation.error) : null);
		}
		//#endregion
		//#region src/client/RunPreview.js
		function materialIdentity(reference) {
			return reference?.kind === "project-file" ? [
				reference.referenceId,
				reference.relativePath,
				reference.sha256,
				reference.sizeBytes
			] : [reference?.referenceId, reference?.kind];
		}
		function hasDraftDiverged(page, run) {
			if (!run) return false;
			if (run.mode === "oasis-legacy") {
				const draft = page.professionalDraft;
				if (!draft || draft.selectedApiId !== run.providerSnapshot.apiId || draft.selectedApiEndpoint !== run.providerSnapshot.apiEndpoint || draft.folderId !== run.providerSnapshot.folderId || JSON.stringify(draft.formValues) !== JSON.stringify(run.inputSnapshot.formValues)) return true;
				const currentReferences = run.inputSnapshot.inputRefs.map((snapshot) => page.inputRefs.find((reference) => reference.referenceId === snapshot.referenceId));
				return currentReferences.some((reference) => reference === void 0) || JSON.stringify(currentReferences.map(materialIdentity)) !== JSON.stringify(run.inputSnapshot.inputRefs.map(materialIdentity));
			}
			return JSON.stringify(page.formValues) !== JSON.stringify(run.inputSnapshot.formValues) || JSON.stringify(page.inputRefs.map(materialIdentity)) !== JSON.stringify(run.inputSnapshot.inputRefs.map(materialIdentity));
		}
		function generationDisabledReason({ syncStatus, validation, operation }) {
			if (syncStatus !== "ready") return syncStatus === "saving" ? "正在保存草稿" : "工作区尚未就绪";
			if (!validation.valid) return "请先修正表单错误";
			if (operation.materialsChanged) return "材料已变化，请先刷新";
			if (operation.activeOperation !== null) return "任务正在处理中";
			return null;
		}
		function statusText(status) {
			if (status === "blocked") return "阻断";
			return "需人工复核";
		}
		const buttonStyle$1 = {
			border: "1px solid var(--dsw-alias-border-l2, #d7d9d8)",
			borderRadius: 7,
			padding: "7px 10px",
			background: "var(--dsw-alias-bg-base, #fff)",
			color: "inherit"
		};
		function RunPreview({ page, operation, validation, syncStatus, onGenerate, onActivateRun, onReviewNote, onReview }) {
			const disabledReason = generationDisabledReason({
				syncStatus,
				validation,
				operation
			});
			const run = page.activeRunId === null ? null : page.runs[page.activeRunId];
			const remoteRun = run?.mode === "oasis-legacy";
			const blocked = run?.result.contentStatus === "blocked";
			return (0, react.createElement)("section", { "aria-labelledby": `oasis-run-title-${page.pageId}` }, (0, react.createElement)("div", { style: {
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "space-between",
				gap: 12,
				marginBottom: 12
			} }, (0, react.createElement)("div", null, (0, react.createElement)("h4", {
				id: `oasis-run-title-${page.pageId}`,
				style: {
					margin: 0,
					fontSize: 15
				}
			}, "生成与结果"), (0, react.createElement)("p", { style: {
				margin: "5px 0 0",
				fontSize: 12,
				color: "var(--dsw-alias-text-secondary, #66706b)"
			} }, remoteRun ? `${run.providerSnapshot?.environmentKind === "production" ? "线上" : "非生产"}专业服务结果；远程内容和文件必须经过人工审核。` : "本地确定性演练；结果必须经过人工审核。")), (0, react.createElement)("button", {
				type: "button",
				disabled: disabledReason !== null,
				onClick: onGenerate,
				title: disabledReason ?? "基于已保存表单和已确认材料生成",
				"aria-describedby": disabledReason ? `oasis-generate-reason-${page.pageId}` : void 0,
				style: {
					...buttonStyle$1,
					background: "#245d47",
					color: "#fff",
					borderColor: "#245d47",
					whiteSpace: "nowrap"
				}
			}, operation.activeOperation === "run-create" ? "生成中…" : "生成新运行")), (0, react.createElement)("div", {
				id: `oasis-generate-reason-${page.pageId}`,
				role: "status",
				"aria-live": "polite",
				style: {
					minHeight: 18,
					fontSize: 12,
					color: "#8a4b2f"
				}
			}, disabledReason ?? (operation.feedback === "run-completed" ? "新运行已完成。" : ""), !validation.valid && validation.firstInvalidFieldId ? (0, react.createElement)("button", {
				type: "button",
				onClick: () => globalThis.document?.getElementById(`oasis-field-${page.pageId}-${validation.firstInvalidFieldId}`)?.focus(),
				style: {
					...buttonStyle$1,
					marginLeft: 8,
					padding: "3px 7px",
					fontSize: 11
				}
			}, "定位首个错误") : null), operation.error ? (0, react.createElement)("div", {
				role: "alert",
				tabIndex: -1,
				style: {
					marginBottom: 10,
					color: "#8b2f24",
					fontSize: 12
				}
			}, `操作失败（${operation.errorCode ?? "unknown"}）。草稿与既有运行仍保留。`) : null, page.runOrder.length > 0 ? (0, react.createElement)("nav", {
				"aria-label": "运行历史",
				style: {
					display: "flex",
					gap: 6,
					overflowX: "auto",
					padding: "4px 0 12px"
				}
			}, ...[...page.runOrder].reverse().map((runId, index) => (0, react.createElement)("button", {
				key: runId,
				type: "button",
				onClick: () => onActivateRun(runId),
				"aria-current": runId === page.activeRunId ? "true" : void 0,
				style: {
					...buttonStyle$1,
					background: runId === page.activeRunId ? "#e7f0eb" : buttonStyle$1.background,
					whiteSpace: "nowrap"
				}
			}, `运行 ${page.runOrder.length - index}`))) : null, run ? (0, react.createElement)("article", { style: {
				display: "grid",
				gap: 12
			} }, (0, react.createElement)("div", { style: {
				display: "flex",
				gap: 8,
				alignItems: "center",
				flexWrap: "wrap",
				fontSize: 12
			} }, (0, react.createElement)("strong", null, statusText(run.result.contentStatus)), (0, react.createElement)("span", null, run.completedAt), hasDraftDiverged(page, run) ? (0, react.createElement)("span", { style: { color: "#8a4b2f" } }, "草稿已偏离此运行；旧运行快照保持不变。") : (0, react.createElement)("span", { style: { color: "#2f6653" } }, "当前草稿与此运行输入一致。")), remoteRun ? (0, react.createElement)("section", { style: {
				borderTop: "1px solid var(--dsw-alias-border-l2, #e0e3e1)",
				paddingTop: 10,
				display: "grid",
				gap: 10
			} }, (0, react.createElement)("h5", { style: {
				margin: 0,
				fontSize: 13
			} }, "远程文字结果"), (0, react.createElement)("pre", { style: {
				margin: 0,
				whiteSpace: "pre-wrap",
				overflowWrap: "anywhere",
				font: "inherit",
				fontSize: 13,
				lineHeight: 1.65
			} }, run.result.answerText), run.result.fileUrls.length > 0 ? (0, react.createElement)("div", null, (0, react.createElement)("strong", { style: { fontSize: 13 } }, "远程文件（未下载、未验证）"), (0, react.createElement)("ul", null, ...run.result.fileUrls.map((url, index) => (0, react.createElement)("li", {
				key: index,
				style: { overflowWrap: "anywhere" }
			}, url)))) : null, (0, react.createElement)("p", { style: {
				margin: 0,
				fontSize: 12,
				color: "var(--dsw-alias-text-secondary, #66706b)"
			} }, "远程文件列表仅为服务响应记录；插件尚未下载、校验或写回这些二进制文件。")) : (0, react.createElement)("div", null, ...run.result.sections.map((section) => (0, react.createElement)("section", {
				key: section.sectionId,
				style: {
					borderTop: "1px solid var(--dsw-alias-border-l2, #e0e3e1)",
					paddingTop: 10
				}
			}, (0, react.createElement)("h5", { style: {
				margin: "0 0 6px",
				fontSize: 13
			} }, section.title), (0, react.createElement)("pre", { style: {
				margin: 0,
				whiteSpace: "pre-wrap",
				overflowWrap: "anywhere",
				font: "inherit",
				fontSize: 13,
				lineHeight: 1.65
			} }, section.body))), run.result.risks.length > 0 ? (0, react.createElement)("div", null, (0, react.createElement)("strong", { style: { fontSize: 13 } }, "风险"), (0, react.createElement)("ul", null, ...run.result.risks.map((risk, index) => (0, react.createElement)("li", { key: index }, risk)))) : null, (0, react.createElement)("p", { style: {
				margin: 0,
				fontSize: 12,
				color: "var(--dsw-alias-text-secondary, #66706b)"
			} }, run.result.disclaimer)), blocked ? (0, react.createElement)("div", {
				role: "alert",
				style: {
					border: "1px solid #d7a69d",
					borderRadius: 8,
					padding: 10,
					color: "#8b2f24"
				}
			}, "该运行包含阻断结果；阻断结果不能批准或回写。请补充信息后生成新运行。") : (0, react.createElement)("div", { style: {
				borderTop: "1px solid var(--dsw-alias-border-l2, #e0e3e1)",
				paddingTop: 12,
				display: "grid",
				gap: 8
			} }, (0, react.createElement)("label", {
				htmlFor: `oasis-review-note-${page.pageId}`,
				style: {
					fontWeight: 650,
					fontSize: 13
				}
			}, "审核意见"), (0, react.createElement)("textarea", {
				id: `oasis-review-note-${page.pageId}`,
				value: operation.reviewNote,
				rows: 3,
				disabled: operation.activeOperation !== null,
				onChange: (event) => onReviewNote(event.currentTarget.value),
				style: {
					width: "100%",
					boxSizing: "border-box",
					border: "1px solid #d7d9d8",
					borderRadius: 8,
					padding: 9
				}
			}), (0, react.createElement)("div", { style: {
				display: "flex",
				gap: 8,
				flexWrap: "wrap"
			} }, (0, react.createElement)("button", {
				type: "button",
				disabled: operation.reviewNote.trim().length === 0 || operation.activeOperation !== null,
				onClick: () => onReview("changes-requested", operation.reviewNote),
				style: buttonStyle$1
			}, "要求修改"), (0, react.createElement)("button", {
				type: "button",
				"data-testid": "oasis-review-approve",
				disabled: operation.activeOperation !== null,
				onClick: () => onReview("approved", operation.reviewNote),
				style: buttonStyle$1
			}, "批准此运行")), run.review.status === "approved" ? (0, react.createElement)("p", { style: {
				margin: 0,
				color: "#2f6653",
				fontSize: 12
			} }, "已记录人工批准；此状态不代表专业、技术或法律结论。") : run.review.status === "changes-requested" ? (0, react.createElement)("p", { style: {
				margin: 0,
				color: "#8a4b2f",
				fontSize: 12
			} }, `已要求修改：${run.review.note}`) : null)) : (0, react.createElement)("div", { style: {
				border: "1px dashed #c8ceca",
				borderRadius: 10,
				padding: 18,
				color: "var(--dsw-alias-text-secondary, #66706b)",
				fontSize: 13
			} }, "保存有效表单并确认材料后，可生成第一个本地运行。"));
		}
		//#endregion
		//#region src/client/SafeMarkdownPreview.js
		const labels = Object.freeze({
			code: Object.freeze({
				copyLabel: "复制",
				copiedLabel: "已复制"
			}),
			footnotes: "注释"
		});
		function SafeMarkdownPreview({ text, markdownRenderer: Renderer, style }) {
			const capable = Renderer?.resourcePolicyVersion === 1;
			return (0, react.createElement)("div", {
				tabIndex: 0,
				style: {
					minWidth: 0,
					overflowWrap: "anywhere",
					...style
				},
				"data-oasis-preview": capable ? "native-safe" : "plain-text"
			}, capable ? (0, react.createElement)(Renderer, {
				text,
				labels,
				streaming: false,
				allowRemoteImages: false
			}) : (0, react.createElement)("pre", { style: {
				margin: 0,
				whiteSpace: "pre-wrap",
				font: "inherit"
			} }, text));
		}
		//#endregion
		//#region src/client/WorkflowForm.js
		const fieldShellStyle = {
			display: "grid",
			gap: 6,
			padding: "0 0 16px"
		};
		const controlStyle = {
			width: "100%",
			boxSizing: "border-box",
			border: "1px solid var(--dsw-alias-border-l2, #d7d9d8)",
			borderRadius: 8,
			padding: "9px 10px",
			background: "var(--dsw-alias-bg-base, #fff)",
			color: "var(--dsw-alias-text-primary, #1f2623)",
			font: "inherit",
			lineHeight: 1.5
		};
		function fieldError(field, value) {
			if (field.control === "short-text" || field.control === "long-text") {
				if (typeof value !== "string") return "字段值格式不正确。";
				if (field.required && value.trim().length === 0) return "此项为必填项。";
				if (value.length > field.maxChars) return `最多输入 ${field.maxChars} 个字符。`;
				return null;
			}
			if (field.control === "string-list") {
				if (!Array.isArray(value)) return "列表格式不正确。";
				if (field.required && value.length === 0) return "请至少填写一项。";
				if (value.length > field.maxItems) return `最多填写 ${field.maxItems} 项。`;
				if (value.some((item) => typeof item !== "string" || item.trim().length === 0)) return "列表项不能为空。";
				if (value.some((item) => item.length > field.itemMaxChars)) return `每项最多 ${field.itemMaxChars} 个字符。`;
				return null;
			}
			if (field.control === "select") {
				if (field.required && (typeof value !== "string" || value.length === 0)) return "请选择一个选项。";
				if (value !== "" && !field.options.some((option) => option.value === value)) return "请选择目录中提供的选项。";
				return null;
			}
			return "不支持的字段控件。";
		}
		function validateWorkflowFormValues(workflow, values) {
			const errors = {};
			for (const field of workflow?.form?.fields ?? []) {
				const error = fieldError(field, values?.[field.fieldId]);
				if (error !== null) errors[field.fieldId] = error;
			}
			const firstInvalidFieldId = Object.keys(errors)[0] ?? null;
			return Object.freeze({
				valid: firstInvalidFieldId === null,
				errors: Object.freeze(errors),
				firstInvalidFieldId
			});
		}
		function controlFor({ pageId, field, value, error, firstInvalidFieldId, disabled, onChange }) {
			const id = `oasis-field-${pageId}-${field.fieldId}`;
			const describedBy = `${id}-description${error ? ` ${id}-error` : ""}`;
			const shared = {
				id,
				name: field.fieldId,
				disabled,
				"data-control": field.control,
				"aria-invalid": Boolean(error),
				"aria-describedby": describedBy,
				"data-first-error": firstInvalidFieldId === field.fieldId || void 0,
				style: {
					...controlStyle,
					borderColor: error ? "var(--dsw-alias-color-danger, #b42318)" : "var(--dsw-alias-border-l2, #d7d9d8)"
				}
			};
			if (field.control === "short-text") return (0, react.createElement)("input", {
				...shared,
				type: "text",
				value: value ?? "",
				maxLength: field.maxChars,
				onChange: (event) => onChange(field.fieldId, event.currentTarget.value)
			});
			if (field.control === "long-text") return (0, react.createElement)("textarea", {
				...shared,
				value: value ?? "",
				maxLength: field.maxChars,
				rows: 5,
				onChange: (event) => onChange(field.fieldId, event.currentTarget.value)
			});
			if (field.control === "string-list") return (0, react.createElement)("textarea", {
				...shared,
				value: Array.isArray(value) ? value.join("\n") : "",
				rows: 4,
				onChange: (event) => onChange(field.fieldId, event.currentTarget.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))
			});
			return (0, react.createElement)("select", {
				...shared,
				value: value ?? "",
				onChange: (event) => onChange(field.fieldId, event.currentTarget.value)
			}, (0, react.createElement)("option", { value: "" }, "请选择"), ...field.options.map((option) => (0, react.createElement)("option", {
				key: option.value,
				value: option.value
			}, option.label)));
		}
		function WorkflowForm({ pageId, workflow, values, validation, disabled, onChange, presentation = "stacked", activeFieldId, onActivateField = () => {}, preview = false, markdownRenderer }) {
			if (presentation === "tabs") {
				const fields = workflow.form.fields;
				const active = fields.find((f) => f.fieldId === activeFieldId) ?? fields[0];
				if (!active) return null;
				const activeId = `oasis-field-${pageId}-${active.fieldId}`;
				const error = validation.errors[active.fieldId];
				return (0, react.createElement)("section", { "aria-label": "输入材料" }, (0, react.createElement)("div", {
					role: "tablist",
					"aria-label": "材料字段",
					style: {
						display: "flex",
						flexWrap: "wrap",
						gap: 4,
						borderBottom: "1px solid #cfddd7",
						marginBottom: 12
					}
				}, ...fields.map((field, index) => (0, react.createElement)("button", {
					key: field.fieldId,
					type: "button",
					role: "tab",
					id: `oasis-material-tab-${pageId}-${field.fieldId}`,
					"aria-selected": field.fieldId === active.fieldId,
					"aria-controls": `oasis-material-editor-${pageId}`,
					tabIndex: field.fieldId === active.fieldId ? 0 : -1,
					onClick: () => onActivateField(field.fieldId),
					onKeyDown: (event) => {
						const next = event.key === "Home" ? 0 : event.key === "End" ? fields.length - 1 : event.key === "ArrowRight" ? (index + 1) % fields.length : event.key === "ArrowLeft" ? (index + fields.length - 1) % fields.length : null;
						if (next === null) return;
						event.preventDefault();
						onActivateField(fields[next].fieldId);
						event.currentTarget.parentElement?.children[next]?.focus();
					},
					style: {
						border: "1px solid #cfddd7",
						borderTop: field.fieldId === active.fieldId ? "3px solid #219772" : "1px solid #cfddd7",
						borderRadius: "9px 9px 0 0",
						padding: "8px 10px",
						font: "inherit",
						fontSize: 12,
						cursor: "pointer",
						background: field.fieldId === active.fieldId ? "var(--dsw-alias-bg-base, #fff)" : "var(--dsw-alias-bg-subtle, #f1f5f4)",
						color: "var(--dsw-alias-text-primary, #243b34)"
					}
				}, field.label, typeof values[field.fieldId] === "string" && values[field.fieldId].trim() ? (0, react.createElement)("span", {
					"aria-label": "已填写",
					style: {
						color: "#219772",
						paddingLeft: 4
					}
				}, "•") : null, validation.errors[field.fieldId] ? (0, react.createElement)("span", {
					"aria-label": "待填写或修正",
					style: {
						color: "#b42318",
						paddingLeft: 3
					}
				}, "＊") : null))), (0, react.createElement)("div", {
					role: "tabpanel",
					id: `oasis-material-editor-${pageId}`,
					"aria-labelledby": `oasis-material-tab-${pageId}-${active.fieldId}`
				}, (0, react.createElement)("label", {
					htmlFor: activeId,
					style: {
						display: "block",
						fontSize: 12,
						marginBottom: 8
					}
				}, active.label), preview ? (0, react.createElement)(SafeMarkdownPreview, {
					markdownRenderer,
					style: {
						...controlStyle,
						minHeight: 240
					},
					text: values[active.fieldId] || "暂无内容"
				}) : controlFor({
					pageId,
					field: active,
					value: values[active.fieldId],
					error,
					firstInvalidFieldId: validation.firstInvalidFieldId,
					disabled,
					onChange
				}), (0, react.createElement)("span", {
					id: `${activeId}-description`,
					style: {
						fontSize: 11,
						color: "var(--dsw-alias-text-secondary, #66706b)"
					}
				}, `最多 ${active.maxChars} 字符`), error ? (0, react.createElement)("span", {
					id: `${activeId}-error`,
					role: "status",
					style: {
						display: "block",
						color: "#b42318",
						fontSize: 12
					}
				}, error) : null));
			}
			return (0, react.createElement)("section", { "aria-labelledby": `oasis-form-title-${pageId}` }, (0, react.createElement)("div", { style: { marginBottom: 16 } }, (0, react.createElement)("h4", {
				id: `oasis-form-title-${pageId}`,
				style: {
					margin: 0,
					fontSize: 15
				}
			}, "工作流输入"), (0, react.createElement)("p", { style: {
				margin: "5px 0 0",
				color: "var(--dsw-alias-text-secondary, #66706b)",
				fontSize: 12
			} }, `字段来自 Host 工作流目录 · ${workflow.workflowId}@${workflow.workflowVersion}`)), ...workflow.form.fields.map((field) => {
				const id = `oasis-field-${pageId}-${field.fieldId}`;
				const error = validation.errors[field.fieldId];
				return (0, react.createElement)("div", {
					key: field.fieldId,
					style: fieldShellStyle,
					"data-field-id": field.fieldId
				}, (0, react.createElement)("label", {
					htmlFor: id,
					style: {
						fontWeight: 650,
						fontSize: 13
					}
				}, field.label, field.required ? (0, react.createElement)("span", {
					"aria-hidden": true,
					style: {
						color: "#9b3d2f",
						marginLeft: 4
					}
				}, "＊") : null), (0, react.createElement)("span", {
					id: `${id}-description`,
					style: {
						color: "var(--dsw-alias-text-secondary, #66706b)",
						fontSize: 12
					}
				}, field.description), controlFor({
					pageId,
					field,
					value: values[field.fieldId],
					error,
					firstInvalidFieldId: validation.firstInvalidFieldId,
					disabled,
					onChange
				}), error ? (0, react.createElement)("span", {
					id: `${id}-error`,
					style: {
						color: "var(--dsw-alias-color-danger, #b42318)",
						fontSize: 12
					}
				}, error) : null);
			}));
		}
		//#endregion
		//#region src/client/WritebackPanel.js
		function shortHash(hash) {
			return typeof hash === "string" ? `${hash.slice(0, 8)}…` : "—";
		}
		const buttonStyle = {
			border: "1px solid var(--dsw-alias-border-l2, #d7d9d8)",
			borderRadius: 7,
			padding: "7px 10px",
			background: "var(--dsw-alias-bg-base, #fff)",
			color: "inherit"
		};
		function WritebackPanel({ run, operation, disabled, onPrepare, onConfirm, onCommit }) {
			if (!run || run.result.contentStatus === "blocked" || run.review.status !== "approved") return null;
			const prepared = operation.writebackPlan;
			const commitDisabled = disabled || !prepared || !operation.writebackConfirmed;
			return (0, react.createElement)("section", {
				"aria-label": "项目回写",
				style: {
					borderTop: "1px solid var(--dsw-alias-border-l2, #e0e3e1)",
					paddingTop: 14,
					display: "grid",
					gap: 10
				}
			}, (0, react.createElement)("h4", { style: {
				margin: 0,
				fontSize: 15
			} }, "项目回写"), (0, react.createElement)("p", { style: {
				margin: 0,
				fontSize: 12,
				color: "var(--dsw-alias-text-secondary, #66706b)"
			} }, "保存到当前 DSH 项目目录，使用 DSH 文件管理查看与编辑。同名文件不会覆盖；专业 API 文件名以 _OIW 结尾。审核与保存不构成专业或法律结论。"), (0, react.createElement)("button", {
				type: "button",
				disabled,
				onClick: onPrepare,
				style: buttonStyle
			}, operation.activeOperation === "writeback-prepare" ? "正在准备…" : "准备回写清单"), prepared ? (0, react.createElement)("div", { style: {
				border: "1px solid #cbd7d0",
				borderRadius: 9,
				padding: 11,
				display: "grid",
				gap: 7
			} }, (0, react.createElement)("strong", { style: { fontSize: 13 } }, "待确认目标"), (0, react.createElement)("code", { style: {
				overflowWrap: "anywhere",
				fontSize: 12
			} }, prepared.manifest.absoluteTarget), ...prepared.manifest.files.map((file) => (0, react.createElement)("div", {
				key: file.absolutePath,
				style: { fontSize: 12 }
			}, (0, react.createElement)("code", { style: { overflowWrap: "anywhere" } }, file.absolutePath), (0, react.createElement)("span", null, ` · SHA-256 ${shortHash(file.sha256)}`))), (0, react.createElement)("label", { style: {
				display: "flex",
				gap: 8,
				alignItems: "flex-start",
				fontSize: 12,
				marginTop: 4
			} }, (0, react.createElement)("input", {
				type: "checkbox",
				checked: operation.writebackConfirmed,
				disabled,
				onChange: (event) => onConfirm(event.currentTarget.checked)
			}), (0, react.createElement)("span", null, "我已复核项目路径和两份文件哈希，同意在当前项目中创建新文件。")), (0, react.createElement)("button", {
				type: "button",
				"data-testid": "oasis-writeback-commit",
				disabled: commitDisabled,
				onClick: onCommit,
				style: {
					...buttonStyle,
					background: "#245d47",
					color: "#fff",
					borderColor: "#245d47"
				}
			}, operation.activeOperation === "writeback-commit" ? "正在提交…" : "确认保存到项目")) : null, (0, react.createElement)("div", {
				role: operation.feedback === "index-warning" ? "alert" : "status",
				"aria-live": "polite",
				style: { fontSize: 12 }
			}, operation.feedback === "writeback-success" ? "保存成功：项目文件和索引均已提交。" : "", operation.feedback === "conflict" ? "版本或目标路径冲突：未执行覆盖，请重新准备。" : "", operation.feedback === "index-warning" ? "文件或索引未完整提交；已创建文件予以保留，请按恢复清单人工核对，不要自动重试。" : ""), operation.indexWarningManifest ? (0, react.createElement)("div", { style: {
				border: "1px solid #d7a69d",
				borderRadius: 8,
				padding: 9,
				fontSize: 12
			} }, (0, react.createElement)("strong", null, "恢复清单"), (0, react.createElement)("div", null, operation.indexWarningManifest.relativeDirectory), ...operation.indexWarningManifest.files.map((file) => (0, react.createElement)("div", { key: file.relativePath }, (0, react.createElement)("code", null, file.relativePath), ` · ${shortHash(file.sha256)}`))) : null);
		}
		//#endregion
		//#region src/client/GenerationSourceSwitch.js
		const SOURCES = [["local-skill", "本地 Skills"], ["oasis-api", "专业 API"]];
		function GenerationSourceSwitch({ value, disabled = false, onChange }) {
			return (0, react.createElement)("div", {
				role: "radiogroup",
				"aria-label": "生成来源",
				"data-testid": "oasis-generation-source",
				style: {
					display: "inline-flex",
					padding: 3,
					borderRadius: 10,
					background: "var(--dsw-alias-bg-subtle, #edf2f0)",
					whiteSpace: "nowrap"
				}
			}, ...SOURCES.map(([source, label], index) => (0, react.createElement)("button", {
				key: source,
				type: "button",
				role: "radio",
				"aria-checked": value === source,
				disabled,
				tabIndex: value === source ? 0 : -1,
				onClick: () => {
					if (!disabled && value !== source) onChange(source);
				},
				onKeyDown: (event) => {
					if (disabled) return;
					const target = event.key === "Home" ? 0 : event.key === "End" ? 1 : [
						"ArrowLeft",
						"ArrowRight",
						"ArrowUp",
						"ArrowDown"
					].includes(event.key) ? 1 - index : null;
					if (target === null) return;
					event.preventDefault();
					onChange(SOURCES[target][0]);
					event.currentTarget.parentElement?.children[target]?.focus();
				},
				style: {
					border: 0,
					borderRadius: 8,
					padding: "8px 10px",
					cursor: disabled ? "not-allowed" : "pointer",
					font: "inherit",
					fontSize: 12,
					color: value === source ? "#137259" : "var(--dsw-alias-text-secondary, #66706b)",
					background: value === source ? "var(--dsw-alias-bg-base, #fff)" : "transparent"
				}
			}, label)));
		}
		//#endregion
		//#region src/client/UnifiedResultPanel.js
		const button$2 = {
			border: "1px solid var(--dsw-alias-border-l2, #d7d9d8)",
			borderRadius: 7,
			padding: "7px 10px",
			background: "var(--dsw-alias-bg-base, #fff)",
			color: "inherit"
		};
		function LocalExecutionSummary({ run }) {
			if (run?.mode !== "dsh-local" || run.status === "prepared") return null;
			const summary = run.executionSummary;
			const stages = {
				preparation: "调用准备",
				stream: "流处理",
				"result-contract": "结果格式校验"
			};
			const finishes = {
				stop: "正常结束",
				"max-tokens": "输出上限",
				"tool-calls": "工具调用",
				error: "提供方错误",
				aborted: "中止"
			};
			const usage = Object.entries({
				inputTokens: "输入（不含缓存命中）",
				cacheReadTokens: "缓存命中",
				outputTokens: "输出",
				reasoningTokens: "其中推理",
				totalTokens: "总计"
			}).filter(([key]) => Number.isSafeInteger(summary?.usage?.[key]) && summary.usage[key] >= 0).map(([key, label]) => `${label} ${summary.usage[key]}`).join(" · ");
			return (0, react.createElement)("details", { style: {
				fontSize: 12,
				marginTop: 8
			} }, (0, react.createElement)("summary", null, run.parentRunId ? "原始调用记录（非新增调用）" : "调用记录"), run.status !== "completed" ? (0, react.createElement)("div", null, `失败阶段：${stages[summary?.failureStage] ?? "未记录"}`) : null, (0, react.createElement)("div", null, `结束原因：${finishes[summary?.finishKind] ?? "未记录"}`), (0, react.createElement)("div", null, `用量：${usage || "未记录"}`), usage ? (0, react.createElement)("small", null, "提供方报告的 tokens；不代表实扣或退款。") : null);
		}
		function localFailureText(run) {
			if (run.executionSummary?.failureStage === "result-contract") return "结果格式不符合业务要求，未保存产物；不会自动重试。";
			if (run.executionSummary?.failureStage === "stream" && run.executionSummary?.finishKind === "max-tokens") return "模型达到输出上限，未取得完整结果；不会自动重试。";
			if (run.failureCode === "INVALID_OUTPUT" && run.executionSummary?.failureStage === "stream") return "模型输出流未通过校验，未保存产物；不会自动重试。";
			return `未取得有效正文（${run.failureCode}），不会自动重试。`;
		}
		function ResultVersion({ page, run, operation, disabled, readOnlyDisabled = disabled, markdownRenderer, onReview = () => {}, onEditResult = () => {}, conversationUnavailableReason = null, savedFileUnavailableReason = "安全文件预览不可用", onOpenSavedFile = () => {}, onUseInConversation = () => {}, onWritebackDraft = () => {}, onPrepareWriteback = () => {}, onWritebackConfirm = () => {}, onCommitWriteback = () => {} }) {
			const [editing, setEditing] = (0, react.useState)(false);
			const [body, setBody] = (0, react.useState)(run.result.artifact.body);
			const [error, setError] = (0, react.useState)(null);
			async function action(fn) {
				setError(null);
				try {
					await fn();
				} catch {
					setError("操作未完成，请检查当前任务状态。");
				}
			}
			return (0, react.createElement)("article", { style: {
				display: "grid",
				gap: 12
			} }, (0, react.createElement)("div", { style: { fontSize: 12 } }, `${run.source === "local-skill" ? "本地 Skills" : "专业 API"} · ${run.mode === "oasis-api" ? run.evidenceKind === "production-api" ? "生产 API 响应" : "非生产 API 响应" : run.evidenceKind === "native-model" ? "原生模型生成" : run.mode === "dsh-local" ? "原生离线验收" : "合成验收"} · ${run.review.status === "approved" ? "已审核" : "待审核"}`), run.mode === "oasis-api" ? (0, react.createElement)("small", null, `服务 ${run.providerSnapshot.apiEndpoint}；远端文件 ${run.remoteResponse.fileUrls.length} 个，仅记录来源，未下载/未验证，不视为已交付。`) : null, editing ? (0, react.createElement)("textarea", {
				"aria-label": "修订结果",
				value: body,
				maxLength: 1e5,
				disabled,
				onChange: (event) => setBody(event.currentTarget.value),
				style: { width: "100%" }
			}) : (0, react.createElement)(SafeMarkdownPreview, {
				markdownRenderer,
				text: run.result.artifact.body,
				style: {
					fontSize: 13,
					lineHeight: 1.65
				}
			}), (0, react.createElement)("div", { style: {
				fontSize: 12,
				color: "var(--dsw-alias-text-secondary, #66706b)"
			} }, "风险未评估 · 待确认问题未评估"), (0, react.createElement)("div", { style: {
				display: "flex",
				flexWrap: "wrap",
				gap: 6
			} }, (0, react.createElement)("button", {
				type: "button",
				style: button$2,
				disabled,
				onClick: () => setEditing(!editing)
			}, editing ? "放弃编辑" : "编辑结果"), editing ? (0, react.createElement)("button", {
				type: "button",
				style: button$2,
				disabled: disabled || !body.trim() || body === run.result.artifact.body,
				onClick: () => action(() => onEditResult(page.pageId, run.runId, body))
			}, "保存为新版本") : null, (0, react.createElement)("button", {
				type: "button",
				style: button$2,
				disabled: disabled || editing || run.review.status === "approved",
				onClick: () => action(() => onReview(page.pageId, run.runId, "approved", ""))
			}, "审核此版本"), (0, react.createElement)("button", {
				type: "button",
				style: button$2,
				title: conversationUnavailableReason ?? void 0,
				disabled: readOnlyDisabled || editing || run.review.status !== "approved" || conversationUnavailableReason !== null,
				onClick: () => action(() => onUseInConversation(page.pageId, run.runId))
			}, "在对话中使用")), error || operation.error ? (0, react.createElement)("div", { role: "alert" }, error ?? `操作未完成（${operation.errorCode ?? "连接失败"}）`) : null, operation.feedback === "conversation-draft-ready" ? (0, react.createElement)("div", { role: "status" }, "已放入对话草稿，尚未发送。") : null, run.writebacks.length ? (0, react.createElement)("section", {
				"aria-label": "已保存文件",
				style: {
					display: "grid",
					gap: 6
				}
			}, ...run.writebacks.map((record) => (0, react.createElement)("div", {
				key: record.writebackId,
				style: {
					display: "flex",
					flexWrap: "wrap",
					gap: 6,
					alignItems: "center"
				}
			}, (0, react.createElement)("span", { style: {
				fontSize: 12,
				overflowWrap: "anywhere"
			} }, record.files.find((file) => file.mediaType === "text/markdown")?.relativePath), (0, react.createElement)("button", {
				type: "button",
				style: button$2,
				title: savedFileUnavailableReason ?? void 0,
				disabled: readOnlyDisabled || editing || run.review.status !== "approved" || savedFileUnavailableReason !== null,
				onClick: () => action(() => onOpenSavedFile(page.pageId, run.runId, record.writebackId))
			}, "打开当前文件"))), (0, react.createElement)("small", null, "当前文件可编辑，不沿用审核结论。")) : null, (0, react.createElement)(WritebackPanel, {
				run,
				operation,
				disabled: disabled || editing,
				onDraft: (directory, confirmed) => onWritebackDraft(page.pageId, directory, confirmed),
				onPrepare: () => onPrepareWriteback(page.pageId, run.runId),
				onConfirm: (confirmed) => onWritebackConfirm(page.pageId, confirmed),
				onCommit: () => onCommitWriteback(page.pageId)
			}));
		}
		function UnifiedResultPanel({ page, onActivateRun = () => {}, ...props }) {
			const run = page.runs[page.activeRunId];
			return (0, react.createElement)("div", null, (0, react.createElement)("nav", {
				"aria-label": "结果版本",
				style: {
					display: "flex",
					gap: 6,
					flexWrap: "wrap",
					marginBottom: 12
				}
			}, ...page.runOrder.map((id, index) => (0, react.createElement)("button", {
				key: id,
				type: "button",
				style: button$2,
				disabled: props.readOnlyDisabled ?? props.disabled,
				"aria-current": id === page.activeRunId ? "true" : void 0,
				onClick: () => onActivateRun(page.pageId, id)
			}, `版本 ${index + 1}`))), run?.status === "completed" && run.result ? (0, react.createElement)(ResultVersion, {
				key: run.runId,
				page,
				run,
				...props
			}) : (0, react.createElement)("p", {
				role: "status",
				style: { fontSize: 13 }
			}, !run ? "暂无生成内容" : run.mode === "dsh-local" ? run.status === "prepared" ? run.evidenceKind === "native-model" ? "原生模型生成中…" : "原生离线生成中…" : run.status === "unknown" ? `运行状态未确认（${run.failureCode}）；已停止本地等待，不代表提供方取消或退款，不会自动重发。` : localFailureText(run) : run.status === "prepared" ? "合成运行未完成；请查看原运行，不会自动重发。" : run.status === "stopped" ? "合成运行已结束，未保存结果。" : "合成失败，未取得正文。"), (0, react.createElement)(LocalExecutionSummary, { run }));
		}
		//#endregion
		//#region src/client/UnifiedGenerationPage.js
		function generationErrorMessage(code) {
			return {
				WORKSPACE_OPERATION_BUSY: "当前项目正在导入、解除关联或准备生成，请等待原操作结束后重新确认；不会自动重试。",
				AUTH_REQUIRED: "请在 DSH 设置 → 绿洲工作台登录账户；如已提交生成，请先查看原运行，不要重复提交。",
				REMOTE_ACCOUNT_UNVERIFIED: "账户身份未能核实，已阻止提交；请检查登录状态并提供此错误码，不要清空任务或重复生成。",
				REMOTE_ACCOUNT_MISMATCH: "当前账户与项目关联或服务返回的账户不一致，已阻止提交；请核对原登录账户，不要重复生成。",
				REMOTE_RUNTIME_CHANGED: "登录状态已变化或暂不可用，本次确认已失效；请检查当前账户后重新核对，已有运行请先查看，不会自动重试。",
				REMOTE_SERVICE_MISMATCH: "服务目录或服务详情与本次确认不匹配，已阻止提交；请重新核对服务与材料，已有运行请先查看，不会自动重试。",
				WORKSPACE_BINDING_REQUIRED: "请在功能中心打开“从网站导入”，选择网站项目并关联；可以不勾选文件。",
				API_SERVICE_MAPPING_REQUIRED: "网站项目已关联，但当前版本尚未确认本模板的专业 API 服务映射；请使用本地 Skills 或等待映射更新，无需填写 JWT 或绑定表单。",
				REMOTE_MAPPING_UNSUPPORTED: "本模板的专业 API 服务映射不兼容，已阻止提交；请使用本地 Skills 或等待映射更新。",
				WEBSITE_PROJECT_LINK_CONFLICT: "网站项目与原服务绑定冲突；请在“从网站导入”窗口明确解除关联，再重新选择项目。本地文件保留。",
				UNRESOLVED_RESPONSE: "尚未取得可用结果，请查看原运行；不会自动重发。停止等待不表示后端取消或退款。"
			}[code] ?? "请检查连接和当前材料；如已有未决任务，请先查看原运行。不会自动重试。";
		}
		const css = `
.oasis-unified { container: oasis-generation / inline-size; min-width: 0; color: var(--dsw-alias-text-primary, #24352f); }
.oasis-unified * { box-sizing: border-box; }
.oasis-unified .generation-heading { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2, #dfe6e2); align-items: center; }
.oasis-unified .generation-title { min-width: 0; }
.oasis-unified .generation-title input { width: 100%; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 650; }
.oasis-unified .generation-notice { grid-column: 2; grid-row: 2; font-size: 11px; text-align: right; color: var(--dsw-alias-text-secondary, #66706b); }
.oasis-unified .generation-views { grid-column: 1; grid-row: 2; display: flex; gap: 4px; }
.oasis-unified .generation-views button, .oasis-unified .editor-tools button { border: 1px solid var(--dsw-alias-border-l2, #dce4df); border-radius: 8px; padding: 6px 9px; background: var(--dsw-alias-bg-base, #fff); color: inherit; cursor: pointer; }
.oasis-unified .generation-panes { display: grid; grid-template-columns: minmax(0, 1fr); }
.oasis-unified .generation-pane { min-width: 0; padding: 16px; }
.oasis-unified .generation-pane[data-visible="false"] { display: none; }
.oasis-unified h3 { font-size: 16px; margin: 0 0 12px; }
.oasis-unified textarea { min-height: 260px; resize: vertical; }
.oasis-unified .editor-tools { display: flex; justify-content: flex-end; gap: 6px; margin-bottom: 12px; }
.oasis-unified .generation-submit { position: sticky; bottom: 0; padding: 14px 0; background: var(--dsw-alias-bg-base, #fff); }
.oasis-unified .generation-submit button { width: 100%; border: 0; border-radius: 9px; padding: 13px; font: inherit; background: #196e55; color: white; }
.oasis-unified .generation-submit button:disabled { opacity: .55; cursor: not-allowed; }
@container oasis-generation (min-width: 680px) {
  .oasis-unified .generation-heading { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); }
  .oasis-unified .generation-notice { grid-column: 3; grid-row: 1; }
  .oasis-unified .generation-views { display: none; }
  .oasis-unified .generation-panes { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .oasis-unified .generation-pane[data-visible="false"] { display: block; }
  .oasis-unified .generation-result { border-left: 1px solid var(--dsw-alias-border-l2, #dfe6e2); }
}
`;
		function UnifiedGenerationPage({ page, workflow, workspaceId, syncStatus, operation, fixtureEnabled = false, apiExecutionAvailable = false, apiConfigurationReady = true, localGenerationEnabled = false, localGenerationKind = null, markdownRenderer, onRenamePage = () => {}, onUpdateForm = () => {}, onSetGenerationSource = () => {}, onGenerate = () => {}, onSelectClaimsUpstream = () => {}, onObserveUnified = () => {}, onStopUnified = () => {}, ...resultActions }) {
			const [activeFieldId, setActiveFieldId] = (0, react.useState)(workflow.form.fields[0]?.fieldId);
			const [view, setView] = (0, react.useState)("input");
			const [preview, setPreview] = (0, react.useState)(false);
			const [upstreamPath, setUpstreamPath] = (0, react.useState)(page.generation.upstream?.relativePath ?? "");
			const source = page.generation.source;
			const local = localGenerationEnabled && source === "local-skill";
			const real = local && localGenerationKind === "native-model";
			const api = source === "oasis-api" && apiExecutionAvailable && !fixtureEnabled;
			const confirmation = api ? operation.apiPreview : operation.localModelPreview;
			const [confirmed, setConfirmed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				setConfirmed(false);
			}, [
				confirmation?.sha256,
				confirmation?.confirmationToken,
				source
			]);
			const locked = !["ready", "saving"].includes(syncStatus) || operation.activeOperation !== null || operation.generationUncertain || hasPendingUnifiedRun(page) || page.remoteExecutionOrder.some((id) => isOasisRemoteExecutionUnresolved(page.remoteExecutions[id]));
			const readOnlyDisabled = syncStatus !== "ready" || operation.activeOperation !== null || operation.generationUncertain === true;
			const validation = validateWorkflowFormValues(workflow, page.formValues);
			const pendingApi = Object.values(page.remoteExecutions).find((e) => e.unifiedClaims && isOasisRemoteExecutionUnresolved(e));
			const latestApi = [...page.remoteExecutionOrder].reverse().map((id) => page.remoteExecutions[id]).find((e) => e.unifiedClaims);
			const reason = (real || api) && page.workflowVersion !== "2" ? "请新建权利要求任务，历史任务仅供查看" : api && !apiConfigurationReady ? "请先在 DSH 设置 → 绿洲工作台登录账户" : api && (page.generation.upstream || page.inputRefs.length) ? "当前 API 映射不支持上游/文件引用；请先取消选择，不会静默忽略材料" : !fixtureEnabled && !local && !api ? generationUnavailableReason(source) : operation.generationUncertain ? "结果未确认，请查看原运行" : hasPendingUnifiedRun(page) || pendingApi ? "原运行未决，请查看状态；不会自动重发" : !validation.valid ? "请填写必填材料" : null;
			const pending = Object.values(page.runs).find((run) => hasPendingUnifiedRun({ runs: { run } }));
			(0, react.useEffect)(() => {
				if (pending?.mode !== "dsh-local" || pending.status !== "prepared" || operation.activeOperation !== null || operation.error || syncStatus !== "ready") return;
				const timer = setTimeout(() => {
					Promise.resolve(onObserveUnified(page.pageId)).catch(() => {});
				}, 1e3);
				return () => clearTimeout(timer);
			}, [
				pending,
				operation.activeOperation,
				operation.error,
				syncStatus,
				onObserveUnified,
				page.pageId
			]);
			return (0, react.createElement)("div", {
				className: "oasis-unified",
				"data-testid": "oasis-unified-page"
			}, (0, react.createElement)("style", null, css), (0, react.createElement)("header", { className: "generation-heading" }, (0, react.createElement)("div", { className: "generation-title" }, (0, react.createElement)("input", {
				key: `${page.pageId}:${page.title}`,
				"aria-label": "任务名称",
				defaultValue: page.title,
				maxLength: 200,
				disabled: locked,
				onBlur: (event) => {
					const title = event.currentTarget.value.trim();
					if (!title) event.currentTarget.value = page.title;
					else if (title !== page.title) onRenamePage(page.pageId, title);
				}
			}), (0, react.createElement)("div", {
				title: workspaceId,
				style: {
					fontSize: 11,
					overflowWrap: "anywhere",
					color: "var(--dsw-alias-text-secondary, #66706b)"
				}
			}, `项目：${workspaceId}`)), (0, react.createElement)(GenerationSourceSwitch, {
				value: source,
				disabled: locked,
				onChange: (value) => onSetGenerationSource(page.pageId, value)
			}), (0, react.createElement)("div", {
				className: "generation-notice",
				role: "status"
			}, real ? "本地 Skills · 使用 DSH 模型" : local ? "原生离线验收 · 无真实调用" : fixtureEnabled ? "合成验收 · 无真实调用" : api ? "专业 API · 逐次确认上传与费用" : source === "local-skill" ? "本地 Skills · 模型服务暂不可用" : "专业 API · 待绑定"), (0, react.createElement)("div", {
				className: "generation-views",
				"aria-label": "输入与结果视图"
			}, ...[["input", "输入"], ["result", "结果"]].map(([id, label]) => (0, react.createElement)("button", {
				key: id,
				type: "button",
				"aria-pressed": view === id,
				onClick: () => setView(id)
			}, label)))), (0, react.createElement)("div", { className: "generation-panes" }, (0, react.createElement)("section", {
				className: "generation-pane",
				"data-visible": view === "input"
			}, (0, react.createElement)("h3", null, "输入材料"), page.workflowVersion === "2" ? (0, react.createElement)("div", { style: {
				fontSize: 11,
				marginBottom: 8
			} }, (0, react.createElement)("label", null, "上游累计文稿", (0, react.createElement)("input", {
				"aria-label": "上游 Markdown 相对路径",
				value: upstreamPath,
				placeholder: "当前项目内的 .md 路径",
				disabled: locked,
				style: {
					width: "100%",
					minWidth: 0
				},
				onChange: (e) => setUpstreamPath(e.currentTarget.value)
			})), (0, react.createElement)("button", {
				type: "button",
				disabled: locked || !upstreamPath.trim(),
				onClick: () => Promise.resolve(onSelectClaimsUpstream(page.pageId, upstreamPath.trim())).catch(() => {})
			}, "确认读取"), page.generation.upstream ? (0, react.createElement)("button", {
				type: "button",
				disabled: locked,
				onClick: () => Promise.resolve(onSelectClaimsUpstream(page.pageId, null)).catch(() => {})
			}, "取消选择") : null, (0, react.createElement)("div", { role: "status" }, page.generation.upstream ? `已确认：${page.generation.upstream.displayName} · ${page.generation.upstream.sha256.slice(0, 8)}` : "上游累计材料：未选择"), (0, react.createElement)("div", null, "仅读取所选文件；明确替换请在用户指令单独写一行“替换：内容ID”。")) : null, (0, react.createElement)("div", { className: "editor-tools" }, (0, react.createElement)("button", {
				type: "button",
				"aria-pressed": !preview,
				onClick: () => setPreview(false)
			}, "编辑 Markdown"), (0, react.createElement)("button", {
				type: "button",
				"aria-pressed": preview,
				onClick: () => setPreview(true)
			}, markdownRenderer?.resourcePolicyVersion === 1 ? "预览效果" : "文本预览")), (0, react.createElement)(WorkflowForm, {
				pageId: page.pageId,
				workflow,
				values: page.formValues,
				validation,
				disabled: locked,
				presentation: "tabs",
				activeFieldId,
				onActivateField: setActiveFieldId,
				preview,
				markdownRenderer,
				onChange: (fieldId, value) => onUpdateForm(page.pageId, fieldId, value)
			}), (0, react.createElement)("div", { className: "generation-submit" }, api && confirmation ? (0, react.createElement)("div", {
				role: "group",
				"aria-label": "本次 API 调用确认",
				style: {
					fontSize: 12,
					marginBottom: 8,
					overflowWrap: "anywhere"
				}
			}, (0, react.createElement)("div", null, `目的地：${confirmation.apiBaseOrigin} · ${confirmation.environmentKind === "production" ? "生产" : "非生产"}`), (0, react.createElement)("div", null, `账户 ${confirmation.accountId} · 目录 ${confirmation.folderName} (${confirmation.folderId}) · 服务 ${confirmation.apiEndpoint}`), (0, react.createElement)("div", null, `技术交底以 technical-disclosure.txt 上传（${confirmation.documentBytes} 字节）；四字段共 ${confirmation.characterCount} 字符，未填字段省略。参考费用 ${confirmation.price}，余额 ${confirmation.balance}。`), (0, react.createElement)("label", null, (0, react.createElement)("input", {
				type: "checkbox",
				checked: confirmed,
				disabled: locked,
				onChange: (event) => setConfirmed(event.currentTarget.checked)
			}), "我确认将本次材料上传至上述服务并生成，可能产生费用；失败不自动切换或重发。"), (0, react.createElement)("button", {
				type: "button",
				disabled: locked || !confirmed || reason !== null,
				onClick: () => {
					setConfirmed(false);
					onGenerate(page.pageId, true);
				}
			}, "确认上传并生成")) : null, real && confirmation ? (0, react.createElement)("div", {
				role: "group",
				"aria-label": "本次模型调用确认",
				style: {
					fontSize: 12,
					marginBottom: 8,
					overflowWrap: "anywhere"
				}
			}, (0, react.createElement)("div", null, `模型：${confirmation.route.provider} / ${confirmation.route.model}${confirmation.route.reasoningEffort ? ` / ${confirmation.route.reasoningEffort}` : ""}`), (0, react.createElement)("div", null, `发送四选项卡文本${confirmation.upstreamIncluded ? "及已选择的上游全文" : "（未选上游文稿）"}，共 ${confirmation.characterCount} 字符${confirmation.skill ? `，另含内置 Skill ${confirmation.skill.id}/${confirmation.skill.version}` : ""}。`), (0, react.createElement)("label", null, (0, react.createElement)("input", {
				type: "checkbox",
				checked: confirmed,
				disabled: locked,
				onChange: (event) => setConfirmed(event.currentTarget.checked)
			}), "我确认向上述模型发送材料和 Skill；云端模型可能产生费用，金额由 DSH 模型配置决定。"), (0, react.createElement)("button", {
				type: "button",
				disabled: locked || !confirmed || reason !== null,
				onClick: () => {
					setConfirmed(false);
					onGenerate(page.pageId, true);
				}
			}, "确认并生成")) : null, (0, react.createElement)("button", {
				type: "button",
				"data-testid": "oasis-unified-generate",
				disabled: locked || syncStatus !== "ready" || reason !== null,
				title: reason ?? void 0,
				onClick: () => onGenerate(page.pageId)
			}, ["run-create", "api-create"].includes(operation.activeOperation) ? "生成中…" : api ? "核对服务与材料（读取账户与目录）" : real ? confirmation ? "重新核对模型与材料" : "核对模型与材料" : local ? "生成离线样本" : fixtureEnabled ? "生成合成样本" : "生成"), operation.error ? (0, react.createElement)("p", { role: "alert" }, `操作未完成。${generationErrorMessage(operation.errorCode)}`) : null, latestApi ? (0, react.createElement)("p", {
				role: "status",
				style: { fontSize: 12 }
			}, `API 原运行：${latestApi.status}${latestApi.safeError ? `（${latestApi.safeError.code}）` : ""}。停止等待不代表后端取消或退款。`) : null, reason ? (0, react.createElement)("p", {
				role: "status",
				style: {
					margin: "8px 0 0",
					fontSize: 12
				}
			}, reason) : null, pending || pendingApi || operation.generationUncertain ? (0, react.createElement)("div", null, (0, react.createElement)("button", {
				type: "button",
				disabled: operation.activeOperation !== null,
				onClick: () => onObserveUnified(page.pageId)
			}, "查看原运行"), pendingApi && (pendingApi.submittedAt !== null || ["prepared", "ready-to-submit"].includes(pendingApi.status)) ? (0, react.createElement)("button", {
				type: "button",
				disabled: operation.activeOperation !== null,
				onClick: () => onStopUnified(page.pageId, pendingApi.executionId)
			}, pendingApi.submittedAt === null ? "放弃提交前准备（保留回执）" : "停止本地等待") : null, pending?.status === "prepared" ? (0, react.createElement)("button", {
				type: "button",
				disabled: operation.activeOperation !== null,
				onClick: () => onStopUnified(page.pageId, pending.runId)
			}, pending.mode === "dsh-local" ? "停止等待" : "结束未完成合成") : null) : null)), (0, react.createElement)("section", {
				className: "generation-pane generation-result",
				"data-visible": view === "result"
			}, (0, react.createElement)("h3", null, "生成结果"), (0, react.createElement)(UnifiedResultPanel, {
				page,
				operation,
				markdownRenderer,
				disabled: locked || syncStatus !== "ready",
				readOnlyDisabled,
				...resultActions
			}))));
		}
		//#endregion
		//#region src/client/FunctionCenter.js
		const NATIVE_TOOLS = Object.freeze([
			{
				id: "editor",
				title: "文件",
				icon: "▱"
			},
			{
				id: "subagent",
				title: "任务管理",
				icon: "◎"
			},
			{
				id: "sidechat",
				title: "侧边对话",
				icon: "⊕"
			},
			{
				id: "browser",
				title: "浏览器",
				icon: "◉"
			}
		]);
		const button$1 = {
			border: "1px solid var(--dsw-alias-border-l2, #dce4df)",
			borderRadius: 10,
			padding: 12,
			background: "var(--dsw-alias-bg-base, #fff)",
			color: "inherit",
			cursor: "pointer",
			font: "inherit"
		};
		function FunctionCenter({ state, nativeAvailability = {}, onOpenNative = () => false, onSelect = () => {}, onImport }) {
			const [category, setCategory] = (0, react.useState)("patent");
			const [notice, setNotice] = (0, react.useState)(null);
			const ready = state.catalogStatus === "ready";
			const tasks = category === "patent" ? [
				{
					id: "patent-claims",
					title: "权利要求书生成"
				},
				{
					id: "patent-description",
					title: "说明书生成"
				},
				{
					id: "patent-check",
					title: "申请文件检查"
				}
			] : category === "rd" ? [{
				id: "technical-rd",
				title: "技术研发辅助"
			}] : [];
			return (0, react.createElement)("section", {
				"aria-label": "功能中心",
				style: {
					padding: 20,
					display: "grid",
					gap: 18
				}
			}, (0, react.createElement)("header", { style: {
				display: "flex",
				justifyContent: "space-between",
				gap: 8,
				alignItems: "center"
			} }, (0, react.createElement)("h3", { style: {
				margin: 0,
				fontSize: 19
			} }, "功能中心"), (0, react.createElement)("small", { style: {
				color: "#307560",
				fontSize: 10
			} }, "BETTER SIDEBAR × OASIS")), onImport ? (0, react.createElement)("button", {
				type: "button",
				onClick: onImport,
				style: button$1
			}, "从网站导入") : null, (0, react.createElement)("div", { style: {
				display: "grid",
				gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
				gap: 8
			} }, ...NATIVE_TOOLS.map((tool) => (0, react.createElement)("button", {
				key: tool.id,
				type: "button",
				style: button$1,
				disabled: nativeAvailability[tool.id] !== true,
				title: nativeAvailability[tool.id] === true ? void 0 : "原生功能不可用或已在侧边卡片设置中关闭",
				onClick: () => {
					if (!onOpenNative(tool.id)) setNotice("当前原生功能不可用，请检查会话与侧边卡片设置。");
				}
			}, (0, react.createElement)("span", {
				"aria-hidden": true,
				style: {
					display: "block",
					fontSize: 20,
					marginBottom: 6
				}
			}, tool.icon), tool.title))), (0, react.createElement)("div", {
				"aria-label": "业务分类",
				style: {
					display: "flex",
					gap: 6,
					flexWrap: "wrap",
					marginTop: 10
				}
			}, ...[
				["rd", "技术研发"],
				["patent", "专利撰写"],
				["tools", "辅助工具"]
			].map(([id, label]) => (0, react.createElement)("button", {
				key: id,
				type: "button",
				"aria-pressed": category === id,
				onClick: () => setCategory(id),
				style: {
					...button$1,
					borderRadius: 18,
					padding: "7px 12px",
					background: category === id ? "#90bfff" : button$1.background,
					color: category === id ? "#fff" : "inherit"
				}
			}, label))), (0, react.createElement)("div", { style: {
				display: "grid",
				gap: 8
			} }, ...tasks.map((task) => {
				const supported = ready && state.workflows.some((w) => w.workflowId === task.id && w.executionMode === "unified-text");
				return (0, react.createElement)("button", {
					key: task.id,
					type: "button",
					disabled: !supported,
					"data-testid": supported ? `oasis-workflow-${task.id}` : void 0,
					onClick: () => onSelect(task.id),
					style: {
						...button$1,
						display: "flex",
						justifyContent: "space-between",
						textAlign: "left",
						opacity: supported ? 1 : .55
					}
				}, task.title, (0, react.createElement)("small", null, supported ? "打开 →" : "待接入"));
			})), !ready ? (0, react.createElement)("div", { role: state.catalogStatus === "error" ? "alert" : "status" }, state.catalogStatus === "error" ? "工作流目录读取失败" : "正在读取工作流目录…") : null, tasks.length === 0 ? (0, react.createElement)("small", null, "暂无已接入任务") : null, notice ? (0, react.createElement)("div", { role: "status" }, notice) : null);
		}
		//#endregion
		//#region src/client/PanelPages.js
		const surfaceStyle = {
			border: "1px solid var(--dsw-alias-border-l2, #dfe2e0)",
			borderRadius: 12,
			padding: 16,
			background: "var(--dsw-alias-bg-base, #fff)"
		};
		const syncNoticeStyle = {
			margin: 20,
			border: "1px solid var(--dsw-alias-border-l2, #d7d9d8)",
			borderRadius: 12,
			padding: 16,
			color: "var(--dsw-alias-text-primary, #1f2623)",
			background: "var(--dsw-alias-bg-base, #fff)"
		};
		function reloadButton(onReload, label) {
			return (0, react.createElement)("button", {
				type: "button",
				onClick: onReload,
				style: {
					marginTop: 12,
					border: "1px solid #d7d9d8",
					borderRadius: 8,
					padding: "7px 10px",
					background: "#fff",
					color: "inherit"
				}
			}, label);
		}
		function activeRun(page) {
			return page.activeRunId === null ? null : page.runs[page.activeRunId];
		}
		function PanelPages({ state, markdownRenderer, savedFileUnavailableReason = "安全文件预览不可用", onOpenSavedFile = () => {}, showFunctionCenter = false, nativeAvailability = {}, onOpenNative = () => false, onImport, effectiveMode = "normal", onSelectWorkflow, onRenamePage, onReload, onUpdateForm = () => {}, onSetGenerationSource = () => {}, onSelectClaimsUpstream = () => {}, onObserveUnified = () => {}, onStopUnified = () => {}, onEditResult = () => {}, onUseInConversation = () => {}, onMaterialDraft = () => {}, onAddMaterial = () => {}, onRefreshMaterial = () => {}, onRemoveMaterial = () => {}, onGenerate = () => {}, onActivateRun = () => {}, onReviewNote = () => {}, onReview = () => {}, onWritebackDraft = () => {}, onPrepareWriteback = () => {}, onWritebackConfirm = () => {}, onCommitWriteback = () => {}, onSelectProfessionalService = () => {}, onUpdateProfessionalField = () => {}, onSelectProfessionalFolder = () => {}, onProfessionalConfirm = () => {}, onStartProfessional = () => {}, onContinueProfessional = () => {}, onStopProfessional = () => {}, onObserveRunningWater = () => {} }) {
			if (state.syncStatus === "idle" || state.syncStatus === "loading") return (0, react.createElement)("div", {
				role: "status",
				"aria-live": "polite",
				style: syncNoticeStyle
			}, "正在读取当前项目的绿洲任务页…");
			if (state.syncStatus === "conflict") {
				const currentRevision = state.conflictCurrent?.revision ?? "未知";
				return (0, react.createElement)("div", {
					role: "alert",
					tabIndex: -1,
					style: syncNoticeStyle
				}, (0, react.createElement)("strong", null, "检测到版本冲突"), (0, react.createElement)("div", { style: {
					marginTop: 6,
					fontSize: 13
				} }, `服务端当前为 revision ${currentRevision}。本地草稿仍保留，系统不会自动覆盖。`), reloadButton(onReload, "重新载入服务端版本（舍弃本地草稿）"));
			}
			if (state.syncStatus === "error") return (0, react.createElement)("div", {
				role: "alert",
				tabIndex: -1,
				style: syncNoticeStyle
			}, (0, react.createElement)("strong", null, "保存或读取失败"), (0, react.createElement)("div", { style: {
				marginTop: 6,
				fontSize: 13
			} }, "本地草稿仍保留。请检查 DSH Host 后，再明确重新载入服务端版本。"), reloadButton(onReload, "重新载入服务端版本"));
			const page = state.pages.find((item) => item.pageId === state.activePageId);
			if (!page) return (0, react.createElement)("div", { style: {
				padding: 20,
				color: "#66706b"
			} }, "请新建任务页。", onImport ? (0, react.createElement)("button", {
				type: "button",
				onClick: onImport
			}, "从网站导入") : null);
			const titleEditor = (0, react.createElement)("div", { style: {
				padding: "14px 20px",
				display: "grid",
				gap: 5,
				borderBottom: "1px solid var(--dsw-alias-border-l2, #eceeec)"
			} }, (0, react.createElement)("label", {
				htmlFor: `oasis-task-title-${page.pageId}`,
				style: {
					fontSize: 11,
					color: "#66706b",
					fontWeight: 650
				}
			}, "任务名称"), (0, react.createElement)("input", {
				key: `${page.pageId}:${page.title}`,
				id: `oasis-task-title-${page.pageId}`,
				"aria-label": "任务名称",
				defaultValue: page.title,
				maxLength: 200,
				disabled: !["ready", "saving"].includes(state.syncStatus),
				onBlur: (event) => {
					const title = event.currentTarget.value.trim();
					if (title.length === 0) return void (event.currentTarget.value = page.title);
					if (title !== page.title) onRenamePage(page.pageId, title);
				},
				style: {
					width: "100%",
					boxSizing: "border-box",
					border: 0,
					padding: 0,
					background: "transparent",
					color: "inherit",
					fontSize: 16,
					fontWeight: 680
				}
			}));
			let content;
			if (page.view === "chooser" || showFunctionCenter) content = (0, react.createElement)(FunctionCenter, {
				onImport,
				state,
				nativeAvailability,
				onOpenNative,
				onSelect: (workflowId) => onSelectWorkflow(page.pageId, workflowId)
			});
			else {
				const workflow = state.workflows.find((item) => item.workflowId === page.workflowId && item.workflowVersion === page.workflowVersion);
				if (!workflow) content = (0, react.createElement)("div", {
					role: "alert",
					tabIndex: -1,
					style: syncNoticeStyle
				}, "当前任务引用的工作流版本不在 Host 目录中。为避免错误解释，已停止编辑和生成。");
				else {
					const operation = state.pageOperations[page.pageId] ?? {
						materialPath: "",
						materialConfirmed: false,
						reviewNote: "",
						writebackDirectory: "",
						writebackConfirmed: false,
						writebackPlan: null,
						requestKey: null,
						activeOperation: null,
						error: null,
						errorCode: null,
						feedback: null,
						materialsChanged: false,
						indexWarningManifest: null,
						professionalDetail: null,
						priceConfirmed: false,
						externalTransferConfirmed: false,
						runningWaterStatus: "idle",
						runningWaterObservation: null
					};
					const validation = validateWorkflowFormValues(workflow, page.formValues);
					const operationDisabled = operation.activeOperation !== null;
					const run = activeRun(page);
					content = workflow.executionMode === "unified-text" && page.generation ? (0, react.createElement)(UnifiedGenerationPage, {
						key: page.pageId,
						page,
						workflow,
						markdownRenderer,
						workspaceId: state.workspaceId,
						syncStatus: state.syncStatus,
						operation,
						onRenamePage,
						onUpdateForm,
						onSetGenerationSource,
						onSelectClaimsUpstream,
						fixtureEnabled: state.unifiedFixtureEnabled === true,
						apiExecutionAvailable: state.apiExecutionAvailable === true,
						apiConfigurationReady: state.professionalConfigurationBlocked !== true,
						localGenerationEnabled: state.localGenerationEnabled === true,
						localGenerationKind: state.localGenerationKind,
						conversationUnavailableReason: state.conversationUnavailableReason === void 0 ? "当前对话输入接口不可用" : state.conversationUnavailableReason,
						onGenerate,
						onObserveUnified,
						onStopUnified,
						onEditResult,
						onUseInConversation,
						savedFileUnavailableReason,
						onOpenSavedFile,
						onActivateRun,
						onReview,
						onWritebackDraft,
						onPrepareWriteback,
						onWritebackConfirm,
						onCommitWriteback
					}) : (0, react.createElement)("div", {
						"data-workspace-layout": true,
						"data-mode": effectiveMode,
						style: {
							display: "grid",
							gridTemplateColumns: effectiveMode === "expanded" ? "minmax(300px, .9fr) minmax(360px, 1.1fr)" : "minmax(0, 1fr)",
							gap: 14,
							padding: 14,
							alignItems: "start"
						}
					}, (0, react.createElement)("div", { style: {
						display: "grid",
						gap: 14,
						minWidth: 0
					} }, (0, react.createElement)("div", { style: surfaceStyle }, (0, react.createElement)(WorkflowForm, {
						pageId: page.pageId,
						workflow,
						values: page.formValues,
						validation,
						disabled: operationDisabled,
						onChange: (fieldId, value) => onUpdateForm(page.pageId, fieldId, value)
					})), (0, react.createElement)("div", { style: surfaceStyle }, (0, react.createElement)(MaterialReferences, {
						page,
						workflow,
						operation,
						disabled: operationDisabled,
						onMaterialDraft: (path, confirmed) => onMaterialDraft(page.pageId, path, confirmed),
						onAdd: () => onAddMaterial(page.pageId),
						onRefresh: (referenceId) => onRefreshMaterial(page.pageId, referenceId),
						onRemove: (referenceId, confirmed) => onRemoveMaterial(page.pageId, referenceId, confirmed)
					})), (0, react.createElement)(ProfessionalServicePanel, {
						state,
						page,
						operation,
						onSelectService: (apiEndpoint) => onSelectProfessionalService(page.pageId, apiEndpoint),
						onUpdateField: (fieldId, value) => onUpdateProfessionalField(page.pageId, fieldId, value),
						onSelectFolder: (folderId) => onSelectProfessionalFolder(page.pageId, folderId),
						onConfirm: (value) => onProfessionalConfirm(page.pageId, value),
						onStart: () => onStartProfessional(page.pageId),
						onContinue: (executionId) => onContinueProfessional(page.pageId, executionId),
						onStop: (executionId) => onStopProfessional(page.pageId, executionId),
						onObserveRunningWater: (runId) => onObserveRunningWater(page.pageId, runId)
					})), (0, react.createElement)("div", { style: {
						...surfaceStyle,
						display: "grid",
						gap: 16,
						minWidth: 0
					} }, (0, react.createElement)(RunPreview, {
						page,
						operation,
						workflow,
						validation,
						syncStatus: state.syncStatus,
						onGenerate: () => onGenerate(page.pageId),
						onActivateRun: (runId) => onActivateRun(page.pageId, runId),
						onReviewNote: (note) => onReviewNote(page.pageId, note),
						onReview: (status, note) => onReview(page.pageId, page.activeRunId, status, note)
					}), (0, react.createElement)(WritebackPanel, {
						run,
						operation,
						disabled: operationDisabled,
						onDraft: (directory, confirmed) => onWritebackDraft(page.pageId, directory, confirmed),
						onPrepare: () => onPrepareWriteback(page.pageId, page.activeRunId),
						onConfirm: (confirmed) => onWritebackConfirm(page.pageId, confirmed),
						onCommit: () => onCommitWriteback(page.pageId)
					})));
				}
			}
			return (0, react.createElement)("main", {
				key: page.pageId,
				id: `oasis-panel-${page.pageId}`,
				role: "tabpanel",
				"aria-labelledby": `oasis-tab-${page.pageId}`,
				style: {
					flex: 1,
					minHeight: 0,
					overflow: "auto",
					background: "var(--dsw-alias-bg-subtle, #f5f7f5)"
				}
			}, page.generation || page.view === "chooser" || showFunctionCenter ? null : titleEditor, content);
		}
		//#endregion
		//#region src/client/OasisAccountSettings.js
		function OasisAccountSettings({ controller }) {
			const snapshot = (0, react.useSyncExternalStore)(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
			const [mode, setMode] = (0, react.useState)("sms");
			const [remaining, setRemaining] = (0, react.useState)(snapshot.retryAfterSeconds ?? 0);
			const phone = (0, react.useRef)(null), secret = (0, react.useRef)(null);
			const disabled = !snapshot.connected || !snapshot.credentialWritable || snapshot.busy;
			const clear = () => {
				if (secret.current) secret.current.value = "";
			};
			(0, react.useEffect)(() => {
				setRemaining(snapshot.retryAfterSeconds ?? 0);
				const timer = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1e3);
				return () => clearInterval(timer);
			}, [snapshot.retryAfterSeconds]);
			(0, react.useEffect)(() => {
				const input = secret.current;
				if (!snapshot.connected && input) input.value = "";
				return () => {
					if (input) input.value = "";
				};
			}, [snapshot.connected, controller]);
			return (0, react.createElement)("section", {
				"aria-label": "绿洲账户",
				style: {
					display: "grid",
					gap: 10
				}
			}, (0, react.createElement)("h3", null, "绿洲账户"), (0, react.createElement)("p", null, "专业 API 使用网站账户登录；本地 Skills 不需要登录。服务地址随版本维护，无需配置。"), !snapshot.connected || snapshot.credentialStatus !== "ready" ? (0, react.createElement)("p", { role: "status" }, "登录服务尚未就绪，请检查本机 Host 连接或刷新状态。") : !snapshot.credentialWritable ? (0, react.createElement)("p", { role: "status" }, "当前模式未开放账户登录或凭据不可写；本地 Skills 不受影响。") : null, snapshot.credentialConfigured ? (0, react.createElement)("div", null, (0, react.createElement)("p", { role: "status" }, `已登录 · 账户 ${snapshot.accountId}`), (0, react.createElement)("button", {
				type: "button",
				disabled: snapshot.busy,
				onClick: () => {
					clear();
					controller.logout();
				}
			}, "退出本插件账户")) : (0, react.createElement)("form", {
				onSubmit: (event) => {
					event.preventDefault();
					const payload = {
						mode,
						phone: phone.current?.value.trim() ?? "",
						confirmed: true,
						[mode === "sms" ? "code" : "password"]: secret.current?.value ?? ""
					};
					clear();
					controller.login(payload);
				},
				style: {
					display: "grid",
					gap: 10
				}
			}, (0, react.createElement)("label", null, "登录方式 ", (0, react.createElement)("select", {
				value: mode,
				disabled,
				onChange: (event) => {
					clear();
					setMode(event.target.value);
				}
			}, (0, react.createElement)("option", { value: "sms" }, "手机验证码"), (0, react.createElement)("option", { value: "password" }, "手机号与密码"))), (0, react.createElement)("label", null, "手机号 ", (0, react.createElement)("input", {
				ref: phone,
				type: "tel",
				autoComplete: "username",
				required: true,
				pattern: "1[3-9][0-9]{9}",
				maxLength: 11,
				disabled
			})), mode === "sms" ? (0, react.createElement)("button", {
				type: "button",
				disabled: disabled || remaining > 0,
				onClick: () => {
					controller.sendSms({
						phone: phone.current?.value.trim() ?? "",
						confirmed: true
					});
				}
			}, remaining > 0 ? `${remaining} 秒后可重新发送` : "发送验证码") : null, (0, react.createElement)("label", null, mode === "sms" ? "验证码 " : "密码 ", (0, react.createElement)("input", {
				key: mode,
				ref: secret,
				type: mode === "sms" ? "text" : "password",
				required: true,
				autoComplete: mode === "sms" ? "one-time-code" : "current-password",
				maxLength: mode === "sms" ? 8 : 256,
				disabled
			})), (0, react.createElement)("small", null, "点击发送或登录，仅将对应登录信息发送到绿洲网站服务；不上传项目材料、不生成内容。"), (0, react.createElement)("button", {
				type: "submit",
				disabled
			}, "登录")), (0, react.createElement)("button", {
				type: "button",
				disabled: !snapshot.connected || snapshot.busy,
				onClick: () => {
					clear();
					controller.refresh();
				}
			}, "刷新登录状态"), snapshot.error ? (0, react.createElement)("div", { role: "alert" }, snapshot.error) : null, snapshot.notice ? (0, react.createElement)("div", { role: "status" }, snapshot.notice) : null);
		}
		//#endregion
		//#region src/website-import-contract.js
		const IMPORT_LIMITS = Object.freeze({
			fileBytes: 33554432,
			totalBytes: 104857600,
			items: 100,
			listItems: 2e3,
			ttlMs: 9e5
		});
		function sanitizeImportDiagnostics(value) {
			const result = {};
			if (!value || typeof value !== "object") return result;
			if ([
				"project-list",
				"project-detail",
				"history-list",
				"history-detail",
				"file-list",
				"file-metadata",
				"file-download",
				"history-attachment"
			].includes(value.endpoint)) result.endpoint = value.endpoint;
			if ([
				"authentication",
				"request",
				"response",
				"body",
				"json",
				"validation"
			].includes(value.stage)) result.stage = value.stage;
			if ([
				"http",
				"network",
				"timeout",
				"json",
				"contract",
				"ownership",
				"operation"
			].includes(value.kind)) result.kind = value.kind;
			if (Number.isInteger(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599) result.httpStatus = value.httpStatus;
			return result;
		}
		const id = number().int().positive().max(Number.MAX_SAFE_INTEGER);
		const token = string().uuid();
		const page = number().int().min(1).max(1e4);
		const key = string().min(1).max(256);
		const importCommands = {
			open: object({
				workspaceId: key,
				confirmed: literal(true)
			}).strict(),
			projects: object({
				token,
				parentId: number().int().nonnegative().default(0),
				page: page.default(1),
				keyword: string().max(200).default("")
			}).strict(),
			items: object({
				token,
				folderId: id,
				kind: _enum(["history", "files"]),
				page: page.default(1)
			}).strict(),
			commit: object({
				token,
				folderId: id,
				keys: array(key).max(IMPORT_LIMITS.items).refine((v) => new Set(v).size === v.length),
				confirmed: literal(true)
			}).strict(),
			unlink: object({
				token,
				expectedSettingsRevision: number().int().nonnegative(),
				confirmed: literal(true)
			}).strict()
		};
		const websiteProjectLinkSchema = object({
			workspaceId: key,
			workspacePath: string().min(1).max(4096),
			apiBaseOrigin: string().url(),
			accountId: id,
			folderId: id,
			folderName: string().min(1).max(200),
			confirmedAt: string().datetime()
		}).strict();
		const project = object({
			id,
			name: string().max(200),
			hasChildren: boolean()
		}).strict();
		const item = object({
			key,
			name: string().max(200),
			fileName: string().max(255),
			kind: _enum([
				"text",
				"file",
				"resource"
			]),
			size: number().int().nonnegative().nullable(),
			downloadable: boolean(),
			reason: string().max(300).nullable()
		}).strict();
		const importResponses = {
			open: object({
				token,
				workspaceId: key,
				workspacePath: string(),
				accountId: id,
				accountRevision: key,
				link: websiteProjectLinkSchema.nullable(),
				settingsRevision: number().int().nonnegative(),
				expiresAt: number()
			}).strict(),
			unlink: object({
				workspaceId: key,
				status: literal("unlinked")
			}).strict(),
			projects: object({
				total: number().int().nonnegative(),
				items: array(project).max(20)
			}).strict(),
			items: object({
				folderId: id,
				total: number().int().nonnegative(),
				items: array(item).max(IMPORT_LIMITS.listItems)
			}).strict(),
			commit: object({
				workspaceId: key,
				folderId: id,
				status: _enum(["completed", "partial"]),
				manifest: string().max(255),
				items: array(object({
					key,
					fileName: string().max(255),
					status: _enum([
						"saved",
						"skipped",
						"failed"
					]),
					code: string().max(100).optional()
				}).strict()).max(100)
			}).strict()
		};
		//#endregion
		//#region src/client/website-import-controller.js
		const empty = () => ({
			busy: false,
			session: null,
			projects: [],
			totalProjects: 0,
			projectPage: 1,
			parentId: 0,
			keyword: "",
			project: null,
			kind: "history",
			itemPage: 1,
			totalItems: 0,
			items: [],
			selected: [],
			result: null,
			error: null,
			notice: null,
			submitted: false
		});
		const explanations = {
			WORKSPACE_OPERATION_BUSY: "当前项目正在导入、解除关联或准备生成，请等待原操作结束后重新确认；不会自动重试。",
			IMPORT_WORKSPACE_BUSY: "当前项目有未结束的生成，请先处理原任务，再导入。",
			AUTH_REQUIRED: "请先在此窗口登录绿洲账户。",
			IMPORT_ACCOUNT_CHANGED: "账户已变化，请重新读取项目。",
			IMPORT_LINK_CONFLICT: "当前本地项目已关联其他网站项目或账户；请在本窗口明确解除原关联后，重新选择项目。已有本地文件不变。",
			IMPORT_SETTINGS_CHANGED: "设置已变化，请重新读取项目，再确认解除关联；不会覆盖其他修改。",
			IMPORT_BUSY: "当前项目正在导入或解除关联，请等待原操作结束。",
			IMPORT_OWNERSHIP: "网站返回的项目或文件归属无法验证，已阻止导入。",
			IMPORT_REQUEST_FAILED: "网站接口读取失败或暂不支持；没有把失败当作空列表。请稍后明确重试。",
			IMPORT_UNSAFE_PATH: "目录或文件名不安全，已阻止写入。",
			IMPORT_TOO_LARGE: "所选文件超过本次大小限制。",
			IMPORT_WORKSPACE_CHANGED: "本地项目已变化，请重新打开导入。",
			IMPORT_EXPIRED: "选择已过期，请重新读取。",
			IMPORT_INCOMPLETE_CHECK_MANIFEST: "导入中断。请在当前项目中查看 .oasis-import- 开头的清单，核对已保存和未完成文件。"
		};
		function explain(error) {
			const base = Object.hasOwn(explanations, error?.code) ? explanations[error.code] : "操作未完成；请检查连接和导入清单，不会自动重试。";
			const d = sanitizeImportDiagnostics(error?.details);
			const endpoint = {
				"project-list": "网站项目列表",
				"project-detail": "项目归属核对",
				"history-list": "历史内容列表",
				"history-detail": "历史内容详情",
				"file-list": "项目文件列表",
				"file-metadata": "项目文件元数据",
				"file-download": "项目文件下载",
				"history-attachment": "历史附件下载"
			};
			const kind = {
				http: "接口响应失败",
				network: "网络或响应传输失败",
				timeout: "请求超时",
				json: "返回内容不是有效 JSON",
				contract: "返回内容不符合接口合同",
				ownership: "项目或文件归属不符",
				operation: "请求操作未完成"
			};
			const stage = {
				authentication: "登录状态检查",
				request: "发送请求",
				response: "响应状态",
				body: "读取响应",
				json: "解析响应",
				validation: "校验响应"
			};
			if (!d.endpoint || !d.kind) return base;
			return `${base} ${endpoint[d.endpoint]}：${kind[d.kind]}${d.stage ? `（${stage[d.stage]}）` : ""}${d.httpStatus ? `，HTTP ${d.httpStatus}` : ""}。不会自动重试。`;
		}
		function createWebsiteImportController({ remote, getWorkspaceId, getAccountRevision }) {
			let snapshot = Object.freeze(empty()), generation = 0, disposed = false;
			const listeners = /* @__PURE__ */ new Set();
			const publish = (changes) => {
				if (disposed) return;
				snapshot = Object.freeze({
					...snapshot,
					...changes
				});
				for (const cb of listeners) cb();
			};
			function current(session) {
				return session && session.workspaceId === getWorkspaceId() && session.accountRevision === getAccountRevision();
			}
			const clear = () => {
				generation++;
				publish(empty());
			};
			async function operation(fn) {
				if (snapshot.busy || disposed) return false;
				const g = generation;
				publish({
					busy: true,
					error: null
				});
				try {
					const patch = await fn();
					if (disposed || g !== generation) return false;
					if (!current(patch?.session ?? snapshot.session)) {
						clear();
						return false;
					}
					publish(patch);
					return true;
				} catch (error) {
					if (!disposed && g === generation) publish({ error: explain(error) });
					return false;
				} finally {
					if (g === generation) publish({ busy: false });
				}
			}
			async function browse({ page = 1, parentId = snapshot.parentId, keyword = snapshot.keyword } = {}) {
				if (!current(snapshot.session)) {
					clear();
					return false;
				}
				return operation(async () => {
					const result = await remote.websiteImport("projects", {
						token: snapshot.session.token,
						parentId,
						page,
						keyword
					});
					return {
						projects: result.items,
						totalProjects: result.total,
						projectPage: page,
						parentId,
						keyword
					};
				});
			}
			async function items({ project = snapshot.project, kind = snapshot.kind, page = 1 } = {}) {
				if (!current(snapshot.session) || !project || snapshot.submitted) return false;
				if (project.id !== snapshot.project?.id) publish({
					selected: [],
					items: [],
					totalItems: 0,
					project,
					result: null
				});
				return operation(async () => {
					const result = await remote.websiteImport("items", {
						token: snapshot.session.token,
						folderId: project.id,
						kind,
						page
					});
					if (result.folderId !== project.id) throw Error("scope");
					return {
						project,
						kind,
						itemPage: page,
						items: result.items,
						totalItems: result.total
					};
				});
			}
			return Object.freeze({
				subscribe(cb) {
					listeners.add(cb);
					return () => listeners.delete(cb);
				},
				getSnapshot: () => snapshot,
				invalidate: clear,
				async start() {
					if (snapshot.busy) return false;
					clear();
					const g = generation;
					return operation(async () => {
						const session = await remote.websiteImport("open", {
							workspaceId: getWorkspaceId(),
							confirmed: true
						});
						if (!current(session) || g !== generation) throw Error("scope");
						publish({ session });
						const result = await remote.websiteImport("projects", {
							token: session.token,
							parentId: 0,
							page: 1,
							keyword: ""
						});
						return {
							session,
							projects: result.items,
							totalProjects: result.total
						};
					});
				},
				browse,
				items,
				selectProject: (project) => items({
					project,
					kind: "history",
					page: 1
				}),
				toggle(key) {
					if (snapshot.busy || snapshot.submitted || !current(snapshot.session) || !snapshot.items.some((v) => v.key === key && v.downloadable)) return;
					const selected = new Set(snapshot.selected);
					if (selected.has(key)) selected.delete(key);
					else if (selected.size < 100) selected.add(key);
					publish({ selected: [...selected] });
				},
				async commit() {
					if (!current(snapshot.session)) {
						clear();
						return false;
					}
					if (!snapshot.project || snapshot.submitted || snapshot.busy) return false;
					const { session, project, selected } = snapshot;
					return operation(async () => {
						publish({ submitted: true });
						const result = await remote.websiteImport("commit", {
							token: session.token,
							folderId: project.id,
							keys: selected,
							confirmed: true
						});
						if (result.workspaceId !== session.workspaceId || result.folderId !== project.id) throw Error("scope");
						return { result };
					});
				},
				async unlink({ confirmed = false } = {}) {
					if (!confirmed || !current(snapshot.session) || !snapshot.session.link || snapshot.busy) return false;
					const { session } = snapshot;
					const done = await operation(async () => {
						const result = await remote.websiteImport("unlink", {
							token: session.token,
							expectedSettingsRevision: session.settingsRevision,
							confirmed: true
						});
						if (result.workspaceId !== session.workspaceId || result.status !== "unlinked") throw Error("scope");
						return {};
					});
					if (done) {
						clear();
						publish({ notice: "关联已解除，本地文件和历史记录保持不变。请重新读取网站项目并选择关联。" });
					}
					return done;
				},
				dispose() {
					disposed = true;
					generation++;
					listeners.clear();
				}
			});
		}
		//#endregion
		//#region src/client/WebsiteImportDialog.js
		const button = {
			padding: "8px 12px",
			border: "1px solid #cfd8d3",
			borderRadius: 8,
			background: "var(--dsw-alias-bg-base, white)",
			color: "inherit",
			font: "inherit",
			cursor: "pointer"
		};
		function WebsiteImportDialog({ workspaceId, remote, accountController, onClose, onOpenFiles }) {
			const account = (0, react.useSyncExternalStore)(accountController.subscribe, accountController.getSnapshot, accountController.getSnapshot);
			const scope = (0, react.useRef)({
				workspaceId,
				accountRevision: account.accountRevision
			});
			scope.current = {
				workspaceId,
				accountRevision: account.accountRevision
			};
			const controller = (0, react.useMemo)(() => createWebsiteImportController({
				remote,
				getWorkspaceId: () => scope.current.workspaceId,
				getAccountRevision: () => scope.current.accountRevision
			}), [remote]);
			const state = (0, react.useSyncExternalStore)(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
			const dialog = (0, react.useRef)(null), busy = (0, react.useRef)(false);
			busy.current = state.busy;
			const [keyword, setKeyword] = (0, react.useState)("");
			const [unlinkConfirm, setUnlinkConfirm] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				setUnlinkConfirm(false);
			}, [
				workspaceId,
				account.accountRevision,
				state.session?.token
			]);
			(0, react.useEffect)(() => {
				controller.invalidate();
			}, [
				controller,
				workspaceId,
				account.accountRevision
			]);
			(0, react.useEffect)(() => () => controller.dispose(), [controller]);
			(0, react.useEffect)(() => {
				const node = dialog.current;
				node?.showModal();
				return () => node?.close();
			}, []);
			const btn = (text, fn, disabled = false) => (0, react.createElement)("button", {
				type: "button",
				style: button,
				disabled: disabled || state.busy,
				onClick: () => {
					fn();
				}
			}, text);
			return (0, react.createElement)("dialog", {
				ref: dialog,
				"aria-labelledby": "oasis-import-title",
				onCancel: (event) => {
					event.preventDefault();
					if (!busy.current) onClose();
				},
				style: {
					width: "min(1000px, 90vw)",
					maxHeight: "85vh",
					padding: 24,
					border: "1px solid #cfd8d3",
					borderRadius: 16,
					background: "var(--dsw-alias-bg-base, white)",
					color: "var(--dsw-alias-text-primary, #202123)",
					overflow: "auto"
				}
			}, (0, react.createElement)("header", { style: {
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center"
			} }, (0, react.createElement)("h2", { id: "oasis-import-title" }, "从网站导入到当前项目"), btn("关闭", onClose)), (0, react.createElement)("p", null, "在此选择网站项目及文件，无需打开网站。只下载勾选内容，不上传本地材料、不生成、不自动同步。"), !account.credentialConfigured ? (0, react.createElement)(OasisAccountSettings, { controller: accountController }) : (0, react.createElement)("p", null, `已登录绿洲账户 ${account.accountId}`), btn(state.session ? "重新读取项目" : "读取网站项目", () => controller.start(), !account.credentialConfigured), state.session ? (0, react.createElement)("div", null, (0, react.createElement)("p", { style: { overflowWrap: "anywhere" } }, `保存到：${state.session.workspacePath}`), state.session.link ? (0, react.createElement)("div", null, (0, react.createElement)("p", null, `当前关联：${state.session.link.folderName}（账户 ${state.session.link.accountId}）；不会自动替换。`), unlinkConfirm ? (0, react.createElement)("div", {
				role: "group",
				"aria-label": "确认解除网站项目关联"
			}, (0, react.createElement)("p", null, "解除当前项目的网站关联及专业 API 服务绑定；已有文件、生成结果和审核记录保留。未结束的生成或导入会阻止解除。"), btn("确认解除关联", () => controller.unlink({ confirmed: true })), btn("取消解除", () => setUnlinkConfirm(false))) : btn("解除关联", () => setUnlinkConfirm(true))) : null, (0, react.createElement)("div", { style: {
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
				gap: 20
			} }, (0, react.createElement)("section", { "aria-label": "网站项目" }, (0, react.createElement)("h3", null, "选择项目"), (0, react.createElement)("form", { onSubmit: (e) => {
				e.preventDefault();
				controller.browse({
					page: 1,
					keyword,
					parentId: 0
				});
			} }, (0, react.createElement)("input", {
				"aria-label": "搜索网站项目",
				placeholder: "搜索项目名称",
				maxLength: 200,
				value: keyword,
				disabled: state.busy,
				onChange: (e) => setKeyword(e.target.value),
				style: {
					...button,
					width: "70%"
				}
			}), (0, react.createElement)("button", {
				type: "submit",
				style: button,
				disabled: state.busy
			}, "搜索")), state.parentId !== 0 ? btn("返回顶层项目", () => controller.browse({
				parentId: 0,
				page: 1
			})) : null, ...state.projects.map((p) => (0, react.createElement)("div", {
				key: p.id,
				style: {
					display: "flex",
					gap: 6,
					marginTop: 8
				}
			}, btn(`${p.name}${state.project?.id === p.id ? " ✓" : ""}`, () => controller.selectProject(p), state.submitted), p.hasChildren ? btn("子项目", () => controller.browse({
				parentId: p.id,
				page: 1,
				keyword: ""
			}), state.submitted) : null)), !state.projects.length ? (0, react.createElement)("p", null, "此页没有项目") : null, (0, react.createElement)("p", null, `第 ${state.projectPage} 页 · ${state.totalProjects} 个项目`), btn("上一页", () => controller.browse({ page: state.projectPage - 1 }), state.projectPage <= 1), btn("下一页", () => controller.browse({ page: state.projectPage + 1 }), state.projectPage * 20 >= state.totalProjects)), (0, react.createElement)("section", { "aria-label": "项目内容" }, (0, react.createElement)("h3", null, state.project ? `选择内容 · ${state.project.name}` : "请先选择项目"), state.project ? (0, react.createElement)("div", null, btn("历史生成内容及附件", () => controller.items({ kind: "history" }), state.submitted), btn("项目文件", () => controller.items({ kind: "files" }), state.submitted), (0, react.createElement)("p", null, state.kind === "history" ? "网站历史正文和生成附件" : "网站项目文件"), ...state.items.map((row) => (0, react.createElement)("label", {
				key: row.key,
				style: {
					display: "block",
					padding: "8px 0",
					overflowWrap: "anywhere"
				}
			}, (0, react.createElement)("input", {
				type: "checkbox",
				checked: state.selected.includes(row.key),
				disabled: state.busy || state.submitted || !row.downloadable,
				onChange: () => controller.toggle(row.key)
			}), ` ${row.fileName} · ${row.size === null ? "大小待下载核实" : `${row.size} 字节`}`, row.reason ? (0, react.createElement)("small", null, ` — ${row.reason}`) : null)), !state.items.length ? (0, react.createElement)("p", null, "此页没有可列出的内容；子项目需单独选择。") : null, (0, react.createElement)("p", null, `第 ${state.itemPage} 页 · ${state.totalItems} 条源记录`), btn("上一页内容", () => controller.items({ page: state.itemPage - 1 }), state.itemPage <= 1 || state.submitted), btn("下一页内容", () => controller.items({ page: state.itemPage + 1 }), state.itemPage * 20 >= state.totalItems || state.submitted)) : null)), (0, react.createElement)("hr"), (0, react.createElement)("p", null, `已勾选 ${state.selected.length} 项。单文件最多 32 MiB，每次最多 100 项 / 100 MiB。`), (0, react.createElement)("p", null, "不勾选文件也可仅关联项目。勾选时，历史正文以 _OIW.md 保存；附件保留文件名。同名不覆盖、同内容跳过，导入内容未在本地审核。"), btn(state.selected.length ? "关联并导入选中文件" : "关联到当前项目", () => controller.commit(), !state.project || state.submitted || unlinkConfirm)) : null, state.busy ? (0, react.createElement)("p", { role: "status" }, state.submitted ? "正在逐项下载并保存，请勿关闭 Host…" : "正在读取…") : null, state.error ? (0, react.createElement)("p", { role: "alert" }, state.error) : null, state.notice ? (0, react.createElement)("p", { role: "status" }, state.notice) : null, state.result ? (0, react.createElement)("section", { "aria-label": "导入结果" }, (0, react.createElement)("h3", null, state.result.status === "completed" ? state.result.items.length ? "关联及导入完成" : "关联成功" : "部分内容未完成"), (0, react.createElement)("p", null, "需要解除或更换关联时，请先点击“重新读取项目”。"), ...state.result.items.map((row) => (0, react.createElement)("p", { key: row.key }, `${{
				saved: "已保存",
				skipped: "相同内容已跳过",
				failed: "未完成"
			}[row.status]}：${row.fileName}${row.code ? `（${row.code}）` : ""}`)), (0, react.createElement)("p", { style: { overflowWrap: "anywhere" } }, `导入清单：${state.result.manifest}`), btn("打开 DSH 文件管理", () => onOpenFiles(), !onOpenFiles)) : null);
		}
		//#endregion
		//#region src/client/OasisWorkbenchSurface.js
		const noConfiguration = Object.freeze({ canSubmit: true });
		const getNoConfiguration = () => noConfiguration;
		const noSubscribe = () => () => {};
		const zero = () => 0;
		const reducedMotionCss = `
  [data-oasis-panel] { transition: left 180ms ease, width 180ms ease; }
  @media (prefers-reduced-motion: reduce) { [data-oasis-panel] { transition: none; } }
  @media (max-width: 760px) {
    [data-oasis-panel] [data-workspace-layout] { grid-template-columns: minmax(0, 1fr) !important; }
  }
`;
		function createPanelActions({ store, workspaceId, focusTargets, confirmClose = (message) => globalThis.confirm?.(message) === true }) {
			return Object.freeze({
				async activatePage(pageId) {
					await store.flushWorkspace(workspaceId);
					store.activatePage(workspaceId, pageId);
				},
				async closePage(pageId) {
					const page = store.getWorkspaceState(workspaceId).pages.find((item) => item.pageId === pageId);
					if (!page) return false;
					if (hasPendingUnifiedRun(page) || page.generation && (store.getWorkspaceState(workspaceId).pageOperations?.[pageId]?.activeOperation || store.getWorkspaceState(workspaceId).pageOperations?.[pageId]?.generationUncertain)) return false;
					if (page.remoteExecutionOrder?.some((executionId) => isOasisRemoteExecutionUnresolved(page.remoteExecutions?.[executionId]))) return false;
					if (page.runOrder.length > 0 && !confirmClose(`任务“${page.title}”包含 ${page.runOrder.length} 个运行记录。确认关闭此任务页？`)) return false;
					await store.flushWorkspace(workspaceId);
					store.closePage(workspaceId, pageId);
					return true;
				},
				async hidePanel() {
					await store.flushWorkspace(workspaceId);
					const current = store.getWorkspaceState(workspaceId);
					if (["ready", "saving"].includes(current.syncStatus)) store.setPanelMode(workspaceId, "hidden");
					else store.setLocalPanelMode(workspaceId, "hidden");
					focusTargets.get(workspaceId)?.focus?.();
				}
			});
		}
		async function ensureEmbeddedWorkspaceHidden({ store, workspaceId, workspaceItems }) {
			store.syncWorkspaces(workspaceItems);
			await Promise.all([
				store.hydrateWorkspace(workspaceId),
				store.loadWorkflowCatalog(workspaceId),
				typeof store.loadProfessionalBootstrap === "function" ? store.loadProfessionalBootstrap(workspaceId).catch(() => null) : Promise.resolve(null)
			]);
			const current = store.getWorkspaceState(workspaceId);
			if (current.panelMode === "hidden") return true;
			if (["ready", "saving"].includes(current.syncStatus)) {
				store.setPanelMode(workspaceId, "hidden");
				await store.flushWorkspace(workspaceId);
				return true;
			}
			store.setLocalPanelMode(workspaceId, "hidden");
			return false;
		}
		async function hydrateSurface({ store, workspaceId, workspaceItems, hostMode }) {
			if (hostMode === "embedded") return ensureEmbeddedWorkspaceHidden({
				store,
				workspaceId,
				workspaceItems
			});
			store.syncWorkspaces(workspaceItems);
			await Promise.all([
				store.hydrateWorkspace(workspaceId),
				store.loadWorkflowCatalog(workspaceId),
				typeof store.loadProfessionalBootstrap === "function" ? store.loadProfessionalBootstrap(workspaceId).catch(() => null) : Promise.resolve(null)
			]);
			return true;
		}
		function sectionStyle(hostMode, layout, effectiveMode) {
			if (hostMode === "embedded") return {
				position: "relative",
				width: "100%",
				height: "100%",
				minHeight: 0,
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				background: "var(--dsw-alias-bg-base, #fff)",
				color: "var(--dsw-alias-text-primary, #202123)"
			};
			return {
				position: "fixed",
				top: 0,
				bottom: 0,
				zIndex: 1,
				display: "flex",
				flexDirection: "column",
				minWidth: 0,
				boxSizing: "border-box",
				overflow: "hidden",
				borderLeft: "1px solid var(--dsw-alias-border-l2, #dedee1)",
				boxShadow: "-10px 0 28px rgba(0, 0, 0, 0.08)",
				background: "var(--dsw-alias-bg-base, #fff)",
				color: "var(--dsw-alias-text-primary, #202123)",
				...effectiveMode === "normal" ? {
					right: 0,
					width: 360
				} : {
					left: layout.panelLeft ?? 72,
					right: 0
				}
			};
		}
		function OasisWorkbenchSurface({ store, markdownRenderer, coordinator, focusTargets, layoutAdapter, workspaceId, workspaceItems, hostMode = "standalone", visible = true }) {
			const [center, setCenter] = (0, react.useState)(false);
			const [importWorkspace, setImportWorkspace] = (0, react.useState)(null);
			const state = (0, react.useSyncExternalStore)(store.subscribe, () => store.peekWorkspaceState(workspaceId), () => store.peekWorkspaceState(workspaceId));
			const panelRef = (0, react.useRef)(null);
			(0, react.useSyncExternalStore)(store.conversationDrafts?.subscribe ?? noSubscribe, store.conversationDrafts?.getSnapshot ?? zero, store.conversationDrafts?.getSnapshot ?? zero);
			const conversationUnavailableReason = store.conversationDrafts?.unavailableReason(workspaceId) ?? (store.conversationDrafts ? null : "当前对话输入接口不可用");
			const configuration = (0, react.useSyncExternalStore)(store.connectionSettings?.subscribe ?? noSubscribe, store.connectionSettings?.getSnapshot ?? getNoConfiguration, store.connectionSettings?.getSnapshot ?? getNoConfiguration);
			const titleRef = (0, react.useRef)(null);
			const layout = (0, react.useSyncExternalStore)(layoutAdapter.subscribe, layoutAdapter.getSnapshot, layoutAdapter.getSnapshot);
			(0, react.useEffect)(() => {
				if (workspaceId !== null) hydrateSurface({
					store,
					workspaceId,
					workspaceItems,
					hostMode
				}).catch(() => {
					if (hostMode === "embedded") try {
						store.setLocalPanelMode(workspaceId, "hidden");
					} catch {}
				});
				else store.syncWorkspaces(workspaceItems);
			}, [
				hostMode,
				store,
				workspaceId,
				workspaceItems
			]);
			(0, react.useEffect)(() => () => {
				if (workspaceId !== null) store.flushWorkspace(workspaceId).catch(() => {});
			}, [store, workspaceId]);
			(0, react.useLayoutEffect)(() => {
				if (hostMode === "embedded") {
					layoutAdapter.releaseStandalone("embedded-surface-active");
					return;
				}
				layoutAdapter.apply({
					requestedMode: workspaceId === null ? "hidden" : state.panelMode,
					panelWidth: 360,
					panelElement: panelRef.current
				});
			}, [
				hostMode,
				layoutAdapter,
				state.panelMode,
				workspaceId
			]);
			(0, react.useEffect)(() => {
				if (hostMode === "embedded" && visible || layout.effectiveMode !== "hidden") titleRef.current?.focus();
			}, [
				hostMode,
				layout.effectiveMode,
				visible,
				workspaceId
			]);
			const layoutBlocked = hostMode === "standalone" && state.panelMode !== "hidden" && layout.requestedMode === state.panelMode && layout.effectiveMode === "hidden" && [
				"incompatible",
				"conflict",
				"faulted"
			].includes(layout.status);
			if (workspaceId === null || hostMode === "standalone" && state.panelMode === "hidden" || layoutBlocked) return null;
			const effectiveMode = hostMode === "embedded" ? "embedded" : layout.requestedMode === state.panelMode ? layout.effectiveMode : state.panelMode;
			const actions = createPanelActions({
				store,
				workspaceId,
				focusTargets
			});
			return (0, react.createElement)("section", {
				ref: panelRef,
				"data-oasis-panel": true,
				"data-testid": hostMode === "embedded" ? "oasis-embedded-workbench" : "oasis-panel",
				"data-host-mode": hostMode,
				"data-mode": effectiveMode,
				"data-requested-mode": state.panelMode,
				"data-layout-status": hostMode === "embedded" ? "better-sidebar-owned" : layout.status,
				"data-workspace-id": workspaceId,
				"data-visible": visible ? "true" : "false",
				"aria-label": "绿洲专业工作台",
				style: sectionStyle(hostMode, layout, effectiveMode)
			}, (0, react.createElement)("style", null, reducedMotionCss), importWorkspace === workspaceId && store.websiteImportRemote && store.connectionSettings ? (0, react.createElement)(WebsiteImportDialog, {
				key: workspaceId,
				workspaceId,
				remote: store.websiteImportRemote,
				accountController: store.connectionSettings,
				onClose: () => setImportWorkspace(null),
				onOpenFiles: coordinator?.nativeAvailability(workspaceId)?.editor ? () => {
					setImportWorkspace(null);
					coordinator.openNativeTool(workspaceId, "editor");
				} : void 0
			}) : null, (0, react.createElement)(PanelChrome, {
				hostMode,
				state: {
					...state,
					effectiveMode,
					layoutStatus: hostMode === "embedded" ? "better-sidebar-owned" : layout.status
				},
				titleRef,
				onOpenFunctionCenter: () => setCenter(true),
				showFunctionCenter: center || state.pages.find((page) => page.pageId === state.activePageId)?.view === "chooser",
				onActivatePage: (pageId) => {
					setCenter(false);
					actions.activatePage(pageId).catch(() => {});
				},
				onClosePage: (pageId) => {
					actions.closePage(pageId).catch(() => {});
				},
				onCreatePage: () => {
					setCenter(false);
					store.createPage(workspaceId);
				},
				onHide: () => {
					if (hostMode === "standalone") actions.hidePanel().catch(() => {});
				},
				onToggleExpanded: () => {
					if (hostMode === "standalone") store.setPanelMode(workspaceId, state.panelMode === "expanded" ? "normal" : "expanded");
				}
			}), (0, react.createElement)(PanelPages, {
				onImport: store.websiteImportRemote && store.connectionSettings ? () => setImportWorkspace(workspaceId) : void 0,
				markdownRenderer,
				savedFileUnavailableReason: coordinator?.captureSavedFileTarget(workspaceId) ? null : "安全文件预览不可用",
				onOpenSavedFile: (pageId, runId, writebackId) => store.openSavedFile(workspaceId, pageId, runId, writebackId),
				showFunctionCenter: center,
				nativeAvailability: coordinator?.nativeAvailability(workspaceId) ?? {},
				onOpenNative: (type) => coordinator?.openNativeTool(workspaceId, type) === true,
				state: {
					...state,
					professionalConfigurationBlocked: !configuration.canSubmit,
					conversationUnavailableReason
				},
				effectiveMode,
				onSelectWorkflow: (pageId, workflowId) => {
					if (store.getWorkspaceState(workspaceId).pages.find((page) => page.pageId === pageId)?.workflowId) {
						store.createPage(workspaceId);
						pageId = store.getWorkspaceState(workspaceId).activePageId;
					}
					store.selectWorkflow(workspaceId, pageId, workflowId);
					setCenter(false);
				},
				onRenamePage: (pageId, title) => store.renamePage(workspaceId, pageId, title),
				onReload: () => store.reloadWorkspace(workspaceId),
				onUpdateForm: (pageId, fieldId, value) => store.updateFormValue(workspaceId, pageId, fieldId, value),
				onSetGenerationSource: (pageId, source) => store.setGenerationSource(workspaceId, pageId, source),
				onSelectClaimsUpstream: (pageId, path) => store.selectClaimsUpstream(workspaceId, pageId, path),
				onObserveUnified: (pageId) => {
					store.observeUnifiedRun(workspaceId, pageId).catch(() => {});
				},
				onStopUnified: (pageId, runId) => {
					store.stopUnifiedRun(workspaceId, pageId, runId).catch(() => {});
				},
				onEditResult: (pageId, runId, body) => store.editUnifiedResult(workspaceId, pageId, runId, body),
				onUseInConversation: (pageId, runId) => store.useInConversation(workspaceId, pageId, runId),
				onMaterialDraft: (pageId, path, confirmed) => store.setMaterialDraft(workspaceId, pageId, path, confirmed),
				onAddMaterial: (pageId) => {
					store.addMaterial(workspaceId, pageId).catch(() => {});
				},
				onRefreshMaterial: (pageId, referenceId) => {
					store.refreshMaterial(workspaceId, pageId, referenceId).catch(() => {});
				},
				onRemoveMaterial: (pageId, referenceId, confirmed) => {
					if (confirmed) store.removeMaterial(workspaceId, pageId, referenceId, true).catch(() => {});
				},
				onGenerate: (pageId, confirmed = false) => {
					store.createRun(workspaceId, pageId, confirmed).catch(() => {});
				},
				onActivateRun: (pageId, runId) => store.activateRun(workspaceId, pageId, runId),
				onReviewNote: (pageId, note) => store.setReviewNote(workspaceId, pageId, note),
				onReview: (pageId, runId, status, note) => {
					store.reviewRun(workspaceId, pageId, runId, status, note).catch(() => {});
				},
				onWritebackDraft: (pageId, directory, confirmed) => {
					store.setWritebackDraft(workspaceId, pageId, directory, confirmed);
				},
				onPrepareWriteback: (pageId, runId) => {
					store.prepareWriteback(workspaceId, pageId, runId).catch(() => {});
				},
				onWritebackConfirm: (pageId, confirmed) => store.setWritebackConfirmation(workspaceId, pageId, confirmed),
				onCommitWriteback: (pageId) => {
					store.commitWriteback(workspaceId, pageId).catch(() => {});
				},
				onSelectProfessionalService: (pageId, apiEndpoint) => {
					store.selectProfessionalService(workspaceId, pageId, apiEndpoint).catch(() => {});
				},
				onUpdateProfessionalField: (pageId, fieldId, value) => {
					store.updateProfessionalFormValue(workspaceId, pageId, fieldId, value);
				},
				onSelectProfessionalFolder: (pageId, folderId) => {
					store.setProfessionalFolder(workspaceId, pageId, folderId);
				},
				onProfessionalConfirm: (pageId, value) => {
					store.setProfessionalConfirmations(workspaceId, pageId, value);
				},
				onStartProfessional: (pageId) => {
					store.startProfessional(workspaceId, pageId).catch(() => {});
				},
				onContinueProfessional: (pageId, executionId) => {
					store.continueProfessional(workspaceId, pageId, executionId).catch(() => {});
				},
				onStopProfessional: (pageId, executionId) => {
					store.stopProfessional(workspaceId, pageId, executionId).catch(() => {});
				},
				onObserveRunningWater: (pageId, runId) => {
					store.observeRunningWater(workspaceId, pageId, runId).catch(() => {});
				}
			}));
		}
		//#endregion
		//#region src/client/panel-host-coordinator.js
		const OASIS_BETTER_SIDEBAR_TAB_ID = "oasis-professional-service:workbench";
		const nativeToolIds = [
			"editor",
			"subagent",
			"sidechat",
			"browser"
		];
		const HOST_MODES = Object.freeze([
			"standalone",
			"integrating",
			"better-sidebar",
			"releasing",
			"blocked"
		]);
		function pendingWorkspaceContext(generation = 0) {
			return Object.freeze({
				status: "pending",
				reasonCode: "workspace-bridge-pending",
				generation,
				currentSessionId: null,
				workspaceItems: Object.freeze([])
			});
		}
		function validService(service) {
			return service !== null && typeof service === "object" && typeof service.registerTab === "function" && typeof service.openTab === "function";
		}
		function validDescriptor(descriptor) {
			return descriptor !== null && typeof descriptor === "object" && descriptor.id === "oasis-professional-service:workbench" && descriptor.single === true && typeof descriptor.component === "function";
		}
		function createPanelHostCoordinator({ layoutAdapter } = {}) {
			if (!layoutAdapter || typeof layoutAdapter.releaseStandalone !== "function") throw new TypeError("layoutAdapter.releaseStandalone is required");
			const listeners = /* @__PURE__ */ new Set();
			let disposed = false;
			let expectsBetterSidebar = false;
			let service = null;
			let registrationDisposer = null;
			let currentDetach = null;
			let serviceContext = null;
			let nativeDisposers = [];
			let snapshot = Object.freeze({
				mode: "standalone",
				reasonCode: null,
				serviceVersion: null,
				serviceFeatures: Object.freeze([]),
				nativeRevision: 0,
				workspaceContext: pendingWorkspaceContext()
			});
			function publish(next) {
				if (disposed) return snapshot;
				const normalized = Object.freeze({
					...snapshot,
					...next
				});
				if (!HOST_MODES.includes(normalized.mode)) throw new Error(`invalid panel host mode: ${normalized.mode}`);
				if (!Object.keys(normalized).some((key) => normalized[key] !== snapshot[key])) return snapshot;
				snapshot = normalized;
				for (const listener of [...listeners]) listener();
				return snapshot;
			}
			function block(reasonCode) {
				layoutAdapter.releaseStandalone(reasonCode);
				return publish({
					mode: "blocked",
					reasonCode,
					serviceVersion: service === null ? null : snapshot.serviceVersion,
					serviceFeatures: service === null ? Object.freeze([]) : snapshot.serviceFeatures
				});
			}
			function reconcileExternalState() {
				if (disposed) return snapshot;
				if (service !== null && registrationDisposer !== null) {
					if (snapshot.mode === "blocked") return snapshot;
					return publish({
						mode: "better-sidebar",
						reasonCode: null
					});
				}
				if (snapshot.mode === "blocked") return snapshot;
				return publish({
					mode: expectsBetterSidebar ? "integrating" : "standalone",
					reasonCode: null,
					serviceVersion: null,
					serviceFeatures: Object.freeze([])
				});
			}
			function expectBetterSidebar() {
				if (disposed) return snapshot;
				expectsBetterSidebar = true;
				layoutAdapter.releaseStandalone("better-sidebar-expected");
				if (snapshot.mode === "blocked") return snapshot;
				return reconcileExternalState();
			}
			function attachBetterSidebar(nextService, descriptor, context = null) {
				if (disposed) return () => {};
				if (!validService(nextService)) {
					block("better-sidebar-service-invalid");
					return () => {};
				}
				if (!validDescriptor(descriptor)) {
					block("better-sidebar-descriptor-invalid");
					return () => {};
				}
				expectsBetterSidebar = true;
				if (service === nextService && currentDetach !== null) return currentDetach;
				if (service !== null || registrationDisposer !== null) {
					block("better-sidebar-service-replaced-without-release");
					return currentDetach ?? (() => {});
				}
				publish({
					mode: "integrating",
					reasonCode: null
				});
				layoutAdapter.releaseStandalone("better-sidebar-integrating");
				let disposer;
				try {
					disposer = nextService.registerTab(descriptor);
				} catch {
					block("better-sidebar-registration-failed");
					return () => {};
				}
				if (typeof disposer !== "function") {
					block("better-sidebar-registration-disposer-invalid");
					return () => {};
				}
				service = nextService;
				serviceContext = context;
				registrationDisposer = disposer;
				const features = Array.isArray(nextService.features) ? Object.freeze(nextService.features.filter((value) => typeof value === "string")) : Object.freeze([]);
				publish({
					mode: "better-sidebar",
					reasonCode: null,
					serviceVersion: typeof nextService.version === "string" ? nextService.version : "unknown",
					serviceFeatures: features
				});
				const changed = () => publish({ nativeRevision: snapshot.nativeRevision + 1 });
				for (const subscribe of [nextService.subscribe, features.includes("stateSubscription") ? nextService.subscribeState : null]) if (typeof subscribe === "function") {
					const cleanup = subscribe.call(nextService, changed);
					if (typeof cleanup === "function") nativeDisposers.push(cleanup);
				}
				let detached = false;
				currentDetach = () => {
					if (detached) return;
					detached = true;
					publish({
						mode: "releasing",
						reasonCode: null
					});
					layoutAdapter.releaseStandalone("better-sidebar-releasing");
					const registeredDisposer = registrationDisposer;
					for (const cleanup of nativeDisposers.splice(0)) try {
						cleanup();
					} catch {}
					service = null;
					serviceContext = null;
					registrationDisposer = null;
					currentDetach = null;
					try {
						registeredDisposer();
					} catch {
						publish({
							mode: "blocked",
							reasonCode: "better-sidebar-registration-dispose-failed",
							serviceVersion: null,
							serviceFeatures: Object.freeze([])
						});
						return;
					}
					reconcileExternalState();
				};
				return currentDetach;
			}
			function openBetterSidebar(sessionId) {
				if (disposed || snapshot.mode !== "better-sidebar" || !validService(service)) return false;
				if (typeof sessionId !== "string" || sessionId.length === 0) return false;
				if (!snapshot.serviceFeatures.includes("targetedOpen")) return false;
				layoutAdapter.releaseStandalone("better-sidebar-open");
				try {
					const seed = { type: OASIS_BETTER_SIDEBAR_TAB_ID };
					service.openTab(seed, { sessionId });
					return true;
				} catch {
					currentDetach?.();
					block("better-sidebar-open-failed");
					return false;
				}
			}
			function nativeScope(workspaceId, type) {
				if (disposed || snapshot.mode !== "better-sidebar" || !nativeToolIds.includes(type) || !snapshot.serviceFeatures.includes("targetedOpen")) return null;
				const context = snapshot.workspaceContext;
				if (context.status !== "ready" || !context.currentSessionId) return null;
				const owners = context.workspaceItems.filter((item) => item.sessionIds?.includes(context.currentSessionId));
				if (owners.length !== 1 || owners[0].workspaceId !== workspaceId) return null;
				try {
					const tab = service.getTabs?.().find((item) => item.id === type && !item.hidden);
					if (!tab || service.isTabEnabled?.(type) !== true) return null;
					const scope = { sessionId: context.currentSessionId };
					if (tab.available) {
						const view = service.getSnapshot?.();
						if (!serviceContext || view?.sessionId !== scope.sessionId || !view.state || tab.available(serviceContext, scope, view.state) !== true) return null;
					}
					return scope;
				} catch {
					return null;
				}
			}
			function openNativeTool(workspaceId, type) {
				const scope = nativeScope(workspaceId, type);
				if (!scope) return false;
				try {
					service.openTab({ type }, scope);
					return true;
				} catch {
					return false;
				}
			}
			function captureSavedFileTarget(workspaceId) {
				const scope = nativeScope(workspaceId, "editor");
				if (!scope || !snapshot.serviceFeatures.includes("safeFilePreview") || !snapshot.serviceFeatures.includes("openFile") || typeof service?.openFile !== "function") return null;
				return Object.freeze({
					workspaceId,
					scope,
					context: snapshot.workspaceContext,
					service
				});
			}
			function openSavedFile(target, file) {
				if (!target || target.context !== snapshot.workspaceContext || target.service !== service || file?.workspaceId !== target.workspaceId || file.kind !== "current-file" || typeof file.absolutePath !== "string" || !captureSavedFileTarget(target.workspaceId)) return false;
				try {
					service.openFile(target.scope, file.absolutePath, void 0, { safePreview: true });
					return true;
				} catch {
					return false;
				}
			}
			return Object.freeze({
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				getSnapshot() {
					return snapshot;
				},
				expectBetterSidebar,
				attachBetterSidebar,
				openBetterSidebar,
				openNativeTool,
				captureSavedFileTarget,
				openSavedFile,
				nativeAvailability(workspaceId) {
					return Object.fromEntries(nativeToolIds.map((id) => [id, nativeScope(workspaceId, id) !== null]));
				},
				reconcileExternalState,
				updateWorkspaceContext(context) {
					if (!context || typeof context !== "object") throw new TypeError("workspace context is required");
					return publish({ workspaceContext: context });
				},
				clearWorkspaceContext() {
					return publish({ workspaceContext: pendingWorkspaceContext(snapshot.workspaceContext.generation + 1) });
				},
				block,
				dispose() {
					if (disposed) return;
					currentDetach?.();
					layoutAdapter.releaseStandalone("panel-host-coordinator-disposed");
					listeners.clear();
					disposed = true;
				}
			});
		}
		//#endregion
		//#region src/client/OasisPanelBoundary.js
		var OasisPanelBoundary = class extends react.Component {
			constructor(props) {
				super(props);
				this.state = { failed: false };
			}
			static getDerivedStateFromError() {
				return { failed: true };
			}
			componentDidCatch(error) {
				this.props.layoutAdapter.fault(`panel-render-error:${error instanceof Error ? error.message : String(error)}`);
			}
			render() {
				return this.state.failed ? null : this.props.children;
			}
		};
		//#endregion
		//#region src/client/project-resolution.js
		function resolveWorkspaceId(currentSessionId, workspaceItems) {
			if (typeof currentSessionId !== "string" || currentSessionId.length === 0) return null;
			if (!Array.isArray(workspaceItems)) return null;
			const matches = workspaceItems.filter((workspace) => typeof workspace?.workspaceId === "string" && Array.isArray(workspace.sessionIds) && workspace.sessionIds.includes(currentSessionId));
			return matches.length === 1 ? matches[0].workspaceId : null;
		}
		//#endregion
		//#region src/client/OasisPanelHost.js
		function OasisPanelHost({ store, focusTargets, layoutAdapter, useSessions, useWorkspaces }) {
			const currentSessionId = useSessions((snapshot) => snapshot.current);
			const workspaceItems = useWorkspaces((snapshot) => snapshot.items);
			const workspaceId = resolveWorkspaceId(currentSessionId, workspaceItems);
			return (0, react.createElement)(OasisWorkbenchSurface, {
				store,
				focusTargets,
				layoutAdapter,
				workspaceId,
				workspaceItems,
				hostMode: "standalone",
				visible: true
			});
		}
		//#endregion
		//#region src/client/OasisPanelPortal.js
		function OasisPanelPortal(props) {
			const { layoutAdapter } = props;
			const [portalHost, setPortalHost] = (0, react.useState)(null);
			(0, react.useLayoutEffect)(() => {
				let host;
				try {
					host = layoutAdapter.mountPortal();
					setPortalHost(host);
				} catch (error) {
					layoutAdapter.fault(`portal-mount-error:${error instanceof Error ? error.message : String(error)}`);
				}
				return () => {
					if (host) layoutAdapter.unmountPortal(host);
				};
			}, [layoutAdapter]);
			if (portalHost === null) return null;
			return (0, react_dom.createPortal)((0, react.createElement)(OasisPanelBoundary, { layoutAdapter }, (0, react.createElement)(OasisPanelHost, props)), portalHost);
		}
		//#endregion
		//#region src/client/WorkspaceContextBridge.js
		function blockedWorkspaceContext(generation) {
			return Object.freeze({
				status: "blocked",
				reasonCode: "workspace-context-invalid",
				generation,
				currentSessionId: null,
				workspaceItems: Object.freeze([])
			});
		}
		function createWorkspaceContextSnapshot({ currentSessionId, workspaceItems, generation }) {
			if (!Number.isSafeInteger(generation) || generation < 0) return blockedWorkspaceContext(0);
			if (currentSessionId !== null && (typeof currentSessionId !== "string" || currentSessionId.length === 0)) return blockedWorkspaceContext(generation);
			if (!Array.isArray(workspaceItems)) return blockedWorkspaceContext(generation);
			const projected = [];
			for (const workspace of workspaceItems) {
				if (typeof workspace?.workspaceId !== "string" || workspace.workspaceId.length === 0 || !Array.isArray(workspace.sessionIds) || workspace.sessionIds.some((sessionId) => typeof sessionId !== "string" || sessionId.length === 0)) return blockedWorkspaceContext(generation);
				projected.push(Object.freeze({
					workspaceId: workspace.workspaceId,
					sessionIds: Object.freeze([...workspace.sessionIds])
				}));
			}
			return Object.freeze({
				status: "ready",
				reasonCode: null,
				generation,
				currentSessionId,
				workspaceItems: Object.freeze(projected)
			});
		}
		function resolveWorkspaceBinding({ context, sessionId, visible }) {
			const generation = Number.isSafeInteger(context?.generation) ? context.generation : 0;
			if (context?.status === "blocked") return Object.freeze({
				status: "blocked",
				reasonCode: context.reasonCode ?? "workspace-context-invalid",
				workspaceId: null,
				generation
			});
			if (context?.status !== "ready") return Object.freeze({
				status: "pending",
				reasonCode: "workspace-bridge-pending",
				workspaceId: null,
				generation
			});
			if (visible === true && context.currentSessionId !== sessionId) return Object.freeze({
				status: "pending",
				reasonCode: "workspace-generation-not-current",
				workspaceId: null,
				generation
			});
			const workspaceId = resolveWorkspaceId(sessionId, context.workspaceItems);
			return Object.freeze({
				status: workspaceId === null ? "unbound" : "ready",
				reasonCode: workspaceId === null ? "workspace-not-resolved" : null,
				workspaceId,
				generation
			});
		}
		function BridgeStatus({ mode, reasonCode }) {
			const blocked = mode === "blocked";
			return (0, react.createElement)("div", {
				role: blocked ? "alert" : "status",
				"data-oasis-host-state": mode,
				"data-oasis-host-reason": reasonCode ?? void 0,
				style: {
					position: "fixed",
					right: 12,
					bottom: 12,
					zIndex: 41,
					maxWidth: 320,
					padding: "8px 10px",
					border: "1px solid var(--dsw-alias-border-l2, #d9d9dc)",
					borderRadius: 8,
					background: "var(--dsw-alias-bg-base, #fff)",
					color: "var(--dsw-alias-text-primary, #202123)",
					fontSize: 12,
					boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)"
				}
			}, blocked ? "绿洲工作台暂不可用：检测到侧栏宿主冲突。" : "正在切换绿洲工作台侧栏宿主…");
		}
		function WorkspaceContextBridge(props) {
			const { coordinator, useSessions, useWorkspaces } = props;
			const currentSessionId = useSessions((snapshot) => snapshot.current);
			const workspaceItems = useWorkspaces((snapshot) => snapshot.items);
			const generationRef = (0, react.useRef)(0);
			const hostSnapshot = (0, react.useSyncExternalStore)(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot);
			(0, react.useLayoutEffect)(() => {
				generationRef.current += 1;
				coordinator.updateWorkspaceContext(createWorkspaceContextSnapshot({
					currentSessionId: currentSessionId ?? null,
					workspaceItems,
					generation: generationRef.current
				}));
				coordinator.reconcileExternalState();
				return () => coordinator.clearWorkspaceContext();
			}, [
				coordinator,
				currentSessionId,
				workspaceItems
			]);
			(0, react.useEffect)(() => {
				if (hostSnapshot.mode !== "better-sidebar") return;
				const binding = resolveWorkspaceBinding({
					context: hostSnapshot.workspaceContext,
					sessionId: currentSessionId,
					visible: true
				});
				if (binding.status !== "ready") return;
				ensureEmbeddedWorkspaceHidden({
					store: props.store,
					workspaceId: binding.workspaceId,
					workspaceItems: hostSnapshot.workspaceContext.workspaceItems
				}).catch(() => {
					try {
						props.store.setLocalPanelMode(binding.workspaceId, "hidden");
					} catch {}
				});
			}, [
				currentSessionId,
				hostSnapshot.mode,
				hostSnapshot.workspaceContext,
				props.store
			]);
			if (hostSnapshot.mode === "standalone") return (0, react.createElement)(OasisPanelPortal, props);
			if ([
				"integrating",
				"releasing",
				"blocked"
			].includes(hostSnapshot.mode)) return (0, react.createElement)(BridgeStatus, {
				mode: hostSnapshot.mode,
				reasonCode: hostSnapshot.reasonCode
			});
			return null;
		}
		//#endregion
		//#region src/client/OasisBetterSidebarTab.js
		function EmbeddedStatus({ status, reasonCode }) {
			const messages = {
				pending: "正在关联当前 DSH 项目…",
				unbound: "当前会话尚未关联唯一的 DSH 项目。请先在中栏切换到一个有效项目。",
				blocked: "绿洲工作台已阻断：项目上下文或侧栏宿主不可安全使用。"
			};
			return (0, react.createElement)("section", {
				role: status === "blocked" ? "alert" : "status",
				"data-oasis-embedded-state": status,
				"data-oasis-embedded-reason": reasonCode ?? void 0,
				style: {
					height: "100%",
					minHeight: 0,
					padding: 20,
					display: "grid",
					alignContent: "start",
					gap: 8,
					background: "var(--dsw-alias-bg-base, #fff)",
					color: "var(--dsw-alias-text-primary, #202123)"
				}
			}, (0, react.createElement)("strong", null, "绿洲专业工作台"), (0, react.createElement)("span", { style: {
				color: "var(--dsw-alias-text-secondary, #6b7280)",
				fontSize: 13,
				lineHeight: 1.5
			} }, messages[status] ?? messages.blocked));
		}
		function OasisBetterSidebarTab({ scope, markdownRenderer, visible, coordinator, store, focusTargets, layoutAdapter }) {
			const hostSnapshot = (0, react.useSyncExternalStore)(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot);
			const sessionId = scope?.sessionId;
			if (hostSnapshot.mode !== "better-sidebar") {
				const status = hostSnapshot.mode === "blocked" ? "blocked" : "pending";
				return (0, react.createElement)(EmbeddedStatus, {
					status,
					reasonCode: hostSnapshot.reasonCode
				});
			}
			const binding = resolveWorkspaceBinding({
				context: hostSnapshot.workspaceContext,
				sessionId,
				visible: visible === true
			});
			if (binding.status !== "ready") return (0, react.createElement)(EmbeddedStatus, {
				status: binding.status,
				reasonCode: binding.reasonCode
			});
			return (0, react.createElement)(OasisWorkbenchSurface, {
				markdownRenderer,
				coordinator,
				store,
				focusTargets,
				layoutAdapter,
				workspaceId: binding.workspaceId,
				workspaceItems: hostSnapshot.workspaceContext.workspaceItems,
				hostMode: "embedded",
				visible: visible === true
			});
		}
		function createOasisBetterSidebarDescriptor({ coordinator, markdownRenderer, store, focusTargets, layoutAdapter }) {
			return Object.freeze({
				id: OASIS_BETTER_SIDEBAR_TAB_ID,
				title: "绿洲专业工作台",
				order: 60,
				single: true,
				component: (props) => (0, react.createElement)(OasisBetterSidebarTab, {
					...props,
					markdownRenderer,
					coordinator,
					store,
					focusTargets,
					layoutAdapter
				})
			});
		}
		//#endregion
		//#region src/client/native-composer-input.js
		function normalizeNativeComposerInput(input) {
			if (!Number.isSafeInteger(input?.draftRev) || input.draftRev < 0) return void 0;
			return {
				...input,
				imageIds: Array.isArray(input.attachmentIds) ? input.attachmentIds : void 0,
				occurrences: Array.isArray(input.occurrences) ? input.occurrences : void 0
			};
		}
		//#endregion
		//#region src/client/ConversationInputRegistration.js
		function LiveRegistration({ bridge, workspaceId, sessionId, useInput, inputActions }) {
			const input = useInput((value) => value);
			const live = (0, react.useRef)(input);
			(0, react.useLayoutEffect)(() => {
				live.current = input;
				bridge.notify();
			}, [bridge, input]);
			(0, react.useLayoutEffect)(() => bridge.register({
				workspaceId,
				sessionId,
				inputActions,
				read: () => normalizeNativeComposerInput(live.current)
			}), [
				bridge,
				workspaceId,
				sessionId,
				inputActions
			]);
			return null;
		}
		function ConversationInputRegistration(props) {
			if (!props.bridge || !props.workspaceId || typeof props.useInput !== "function" || typeof props.inputActions?.setDraft !== "function") return null;
			return (0, react.createElement)(LiveRegistration, props);
		}
		//#endregion
		//#region src/client/WorkbenchEntry.js
		const STANDALONE_HOST_SNAPSHOT = Object.freeze({ mode: "standalone" });
		const subscribeStandaloneHost = () => () => {};
		const getStandaloneHostSnapshot = () => STANDALONE_HOST_SNAPSHOT;
		function useLivePanelHostSnapshot(coordinator) {
			return (0, react.useSyncExternalStore)(coordinator === null ? subscribeStandaloneHost : coordinator.subscribe, coordinator === null ? getStandaloneHostSnapshot : coordinator.getSnapshot, coordinator === null ? getStandaloneHostSnapshot : coordinator.getSnapshot);
		}
		function WorkbenchEntry({ sessionId, store, focusTargets, useWorkspaces, useInput, inputActions, coordinator = null, usePanelHostSnapshot = useLivePanelHostSnapshot }) {
			const workspaceItems = useWorkspaces((snapshot) => snapshot.items);
			const workspaceId = resolveWorkspaceId(sessionId, workspaceItems);
			const hostSnapshot = usePanelHostSnapshot(coordinator);
			let mountedTarget = null;
			function registerFocusTarget(node) {
				if (workspaceId === null) return;
				if (node === null) {
					if (mountedTarget !== null && focusTargets.get(workspaceId) === mountedTarget) focusTargets.delete(workspaceId);
					mountedTarget = null;
					return;
				}
				mountedTarget = node;
				focusTargets.set(workspaceId, node);
			}
			function openWorkbench(event) {
				if (workspaceId === null) return;
				if (coordinator?.getSnapshot?.().mode === "better-sidebar" && !coordinator.getSnapshot().serviceFeatures?.includes("targetedOpen")) return;
				store.syncWorkspaces(workspaceItems);
				focusTargets.set(workspaceId, event.currentTarget);
				if (coordinator?.getSnapshot?.().mode === "better-sidebar") {
					coordinator.openBetterSidebar(sessionId);
					return;
				}
				if (coordinator && coordinator.getSnapshot().mode !== "standalone") return;
				store.openPanel(workspaceId);
			}
			const hostMode = hostSnapshot.mode;
			const targetedOpenUnavailable = hostMode === "better-sidebar" && !hostSnapshot.serviceFeatures?.includes("targetedOpen");
			const hostUnavailable = targetedOpenUnavailable || [
				"integrating",
				"releasing",
				"blocked"
			].includes(hostMode);
			const disabled = workspaceId === null || hostUnavailable;
			const unavailableTitle = targetedOpenUnavailable ? "当前侧栏版本不支持按会话打开绿洲工作台" : hostMode === "blocked" ? "侧栏宿主冲突，绿洲工作台已安全阻断" : "绿洲工作台正在切换侧栏宿主";
			return (0, react.createElement)("button", {
				type: "button",
				ref: registerFocusTarget,
				"data-testid": "oasis-workbench-entry",
				disabled,
				"data-oasis-host-mode": hostMode,
				"data-oasis-host-version": hostSnapshot.serviceVersion ?? void 0,
				title: workspaceId === null ? "当前会话尚未关联项目" : hostUnavailable ? unavailableTitle : "打开技术研发与中国发明专利工作台",
				"aria-label": workspaceId === null ? "当前会话尚未关联项目" : hostUnavailable ? unavailableTitle : "打开技术研发与中国发明专利工作台",
				onClick: openWorkbench,
				style: {
					border: "1px solid var(--dsw-alias-border-l2, #d9d9dc)",
					borderRadius: 8,
					background: "var(--dsw-alias-bg-base, #fff)",
					color: "var(--dsw-alias-text-primary, #202123)",
					padding: "5px 9px",
					fontSize: 12,
					cursor: disabled ? "not-allowed" : "pointer",
					opacity: disabled ? .5 : 1
				}
			}, "研发 / 专利", (0, react.createElement)(ConversationInputRegistration, {
				bridge: store.conversationDrafts,
				workspaceId,
				sessionId,
				useInput,
				inputActions
			}));
		}
		//#endregion
		//#region src/oasis-account-contract.js
		const OASIS_PRODUCT_ORIGIN = `https://${OASIS_PRODUCTION_HOSTNAME}`;
		const phone = string().regex(/^1[3-9]\d{9}$/);
		object({}).strict(), object({
			phone,
			confirmed: literal(true)
		}).strict(), discriminatedUnion("mode", [object({
			mode: literal("sms"),
			phone,
			code: string().regex(/^\d{4,8}$/),
			confirmed: literal(true)
		}).strict(), object({
			mode: literal("password"),
			phone,
			password: string().min(1).max(256),
			confirmed: literal(true)
		}).strict()]), object({ confirmed: literal(true) }).strict();
		const accountStatusSchema = object({
			authenticated: boolean(),
			available: boolean(),
			writable: boolean(),
			accountId: number().int().positive().nullable(),
			revision: string().max(100).nullable(),
			retryAfterSeconds: number().int().nonnegative()
		}).strict();
		//#endregion
		//#region src/client/workbench-remote.js
		const CHANNEL = "/oasis-workbench";
		var WorkbenchRemoteError = class extends Error {
			constructor(code, message, details) {
				super(message);
				this.name = "WorkbenchRemoteError";
				this.code = code;
				this.details = details;
			}
		};
		function unwrap(result, schema) {
			if (result?.ok === true && Object.hasOwn(result, "value")) {
				const parsed = schema.safeParse(result.value);
				if (parsed.success) return parsed.data;
				throw new WorkbenchRemoteError("malformed-response", "Malformed Oasis workbench response payload", { issues: parsed.error.issues });
			}
			if (result?.ok === false && result.error && typeof result.error.code === "string") throw new WorkbenchRemoteError(result.error.code, typeof result.error.message === "string" ? result.error.message : "Oasis workbench request failed", result.error.details);
			throw new WorkbenchRemoteError("malformed-response", "Malformed Oasis workbench Connection result", {});
		}
		function createWorkbenchRemote(connection) {
			if (typeof connection?.rpc?.call !== "function") throw new TypeError("DSH connection.rpc.call is required");
			const call = (channel, endpoint, payload, signal) => {
				if (channel !== CHANNEL) throw new TypeError("Unexpected workbench channel");
				return connection.rpc.call("/api", `oasis-workbench/${endpoint}`, payload, signal);
			};
			return Object.freeze({
				async websiteImport(action, payload) {
					if (!Object.hasOwn(importCommands, action)) throw new WorkbenchRemoteError("IMPORT_INVALID_INPUT", "导入动作无效");
					const input = importCommands[action].parse(payload);
					const result = unwrap(await call(CHANNEL, `import/${action}`, input), importResponses[action]);
					if (action === "open" && result.workspaceId !== input.workspaceId || ["items", "commit"].includes(action) && result.folderId !== input.folderId) throw new WorkbenchRemoteError("INVALID_RESPONSE", "导入项目不一致");
					return result;
				},
				async accountStatus() {
					return unwrap(await call(CHANNEL, "account/status", {}), accountStatusSchema);
				},
				async accountSms(payload) {
					return unwrap(await call(CHANNEL, "account/sms", payload), accountStatusSchema);
				},
				async accountLogin(payload) {
					return unwrap(await call(CHANNEL, "account/login", payload), accountStatusSchema);
				},
				async accountLogout(payload) {
					return unwrap(await call(CHANNEL, "account/logout", payload), accountStatusSchema);
				},
				async getWorkspaceBinding(payload, signal) {
					const result = unwrap(await call(CHANNEL, "professional/binding/get", payload, signal), workspaceBindingReadSchema);
					if (result.workspaceId !== payload.workspaceId) throw new WorkbenchRemoteError("INVALID_RESPONSE", "绑定项目不一致");
					return result;
				},
				async getBindingOptions(payload, signal) {
					const result = unwrap(await call(CHANNEL, "professional/binding/options", payload, signal), workspaceBindingOptionsSchema);
					if (result.workspaceId !== payload.workspaceId) throw new WorkbenchRemoteError("INVALID_RESPONSE", "绑定项目不一致");
					return result;
				},
				async confirmWorkspaceBinding(payload, signal) {
					const result = unwrap(await call(CHANNEL, "professional/binding/confirm", payload, signal), workspaceBindingSavedSchema);
					for (const key of [
						"workspaceId",
						"workspacePath",
						"apiBaseOrigin",
						"accountId",
						"apiId",
						"apiEndpoint",
						"apiProcess",
						"folderId",
						"schemaHash"
					]) if (result.binding[key] !== payload[key]) throw new WorkbenchRemoteError("INVALID_RESPONSE", "绑定范围不一致");
					return result;
				},
				async prepareClaimsApi(payload, signal) {
					const result = unwrap(await call(CHANNEL, "task/prepare-api", payload, signal), claimsApiPreparationSchema);
					for (const key of [
						"workspaceId",
						"taskId",
						"expectedRevision",
						"expectedSettingsRevision"
					]) if (result.snapshot[key] !== payload[key]) throw new WorkbenchRemoteError("INVALID_RESPONSE", "API 材料准备范围不一致");
					return result;
				},
				async previewClaimsApi(payload, signal) {
					const result = unwrap(await call(CHANNEL, "task/preview-api", payload, signal), claimsApiPreviewSchema);
					for (const key of [
						"workspaceId",
						"taskId",
						"expectedRevision",
						"expectedSettingsRevision",
						"preparationSha256"
					]) if (result[key] !== payload[key]) throw new WorkbenchRemoteError("INVALID_RESPONSE", "API 确认范围不一致");
					return result;
				},
				async startClaimsApi(payload, signal) {
					return unwrap(await call(CHANNEL, "task/start-api", payload, signal), workbenchReplaceResponseSchema);
				},
				async get(workspaceId, signal) {
					return unwrap(await call(CHANNEL, "state/get", { workspaceId }, signal), workbenchGetResponseSchema);
				},
				async replace(workspaceId, expectedRevision, state, signal) {
					return unwrap(await call(CHANNEL, "state/replace", {
						workspaceId,
						expectedRevision,
						state
					}, signal), workbenchReplaceResponseSchema);
				},
				async getWorkflowCatalog(workType, signal) {
					return unwrap(await call(CHANNEL, "workflow/catalog", workType === void 0 ? {} : { workType }, signal), workflowCatalogResponseSchema);
				},
				async getProfessionalBootstrap(signal) {
					return unwrap(await call(CHANNEL, "professional/bootstrap", {}, signal), oasisProfessionalBootstrapSchema);
				},
				async getProfessionalDetail(apiEndpoint, signal) {
					return unwrap(await call(CHANNEL, "professional/detail", { apiEndpoint }, signal), oasisProfessionalDetailSchema);
				},
				async startProfessional(payload, signal) {
					return unwrap(await call(CHANNEL, "professional/start", payload, signal), workbenchReplaceResponseSchema);
				},
				async continueProfessional(payload, signal) {
					return unwrap(await call(CHANNEL, "professional/continue", payload, signal), workbenchReplaceResponseSchema);
				},
				async stopProfessional(payload, signal) {
					return unwrap(await call(CHANNEL, "professional/stop", payload, signal), oasisProfessionalStopResponseSchema);
				},
				async observeRunningWater(payload, signal) {
					const observation = unwrap(await call(CHANNEL, "professional/running-water", payload, signal), oasisRunningWaterObservationSchema);
					if (observation.runId !== payload.runId) throw new WorkbenchRemoteError("malformed-response", "Running-water response does not match the requested run", {});
					return observation;
				},
				async addMaterial(payload, signal) {
					return unwrap(await call(CHANNEL, "material/add", payload, signal), workbenchReplaceResponseSchema);
				},
				async refreshMaterial(payload, signal) {
					return unwrap(await call(CHANNEL, "material/refresh", payload, signal), workbenchReplaceResponseSchema);
				},
				async removeMaterial(payload, signal) {
					return unwrap(await call(CHANNEL, "material/remove", payload, signal), workbenchReplaceResponseSchema);
				},
				async createRun(payload, signal) {
					return unwrap(await call(CHANNEL, "task/create", payload, signal), workbenchReplaceResponseSchema);
				},
				async reviewRun(payload, signal) {
					return unwrap(await call(CHANNEL, "task/review", payload, signal), workbenchReplaceResponseSchema);
				},
				async createUnifiedRun(payload, signal) {
					return unwrap(await call(CHANNEL, "task/create-unified", payload, signal), workbenchReplaceResponseSchema);
				},
				async selectClaimsUpstream(payload, signal) {
					return unwrap(await call(CHANNEL, "task/select-upstream", payload, signal), workbenchReplaceResponseSchema);
				},
				async prepareLocalRun(payload, signal) {
					const result = unwrap(await call(CHANNEL, "task/prepare-local", payload, signal), localGenerationPreviewSchema);
					for (const key of [
						"workspaceId",
						"taskId",
						"sessionId",
						"expectedRevision"
					]) if (result[key] !== payload[key]) throw new WorkbenchRemoteError("INVALID_RESPONSE", "生成确认范围不一致");
					return result;
				},
				async createLocalRun(payload, signal) {
					return unwrap(await call(CHANNEL, "task/create-local", payload, signal), workbenchReplaceResponseSchema);
				},
				async observeLocalRun(payload, signal) {
					return unwrap(await call(CHANNEL, "task/observe-local", payload, signal), workbenchReplaceResponseSchema);
				},
				async stopUnifiedRun(payload, signal) {
					return unwrap(await call(CHANNEL, "task/stop-unified", payload, signal), workbenchReplaceResponseSchema);
				},
				async editUnifiedResult(payload, signal) {
					return unwrap(await call(CHANNEL, "task/edit-result", payload, signal), workbenchReplaceResponseSchema);
				},
				async prepareConversationDraft(payload, signal) {
					const result = unwrap(await call(CHANNEL, "artifact/conversation-draft", payload, signal), conversationDraftResponseSchema);
					for (const key of [
						"workspaceId",
						"taskId",
						"runId",
						"artifactId"
					]) if (result[key] !== payload[key]) throw new WorkbenchRemoteError("malformed-response", "Conversation artifact identity mismatch", {});
					return result;
				},
				async resolveSavedFile(payload, signal) {
					const result = unwrap(await call(CHANNEL, "artifact/saved-file", payload, signal), savedFileResponseSchema);
					for (const key of [
						"workspaceId",
						"taskId",
						"runId",
						"artifactId",
						"writebackId"
					]) if (result[key] !== payload[key]) throw new WorkbenchRemoteError("malformed-response", "Saved file identity mismatch", {});
					return result;
				},
				async prepareWriteback(payload, signal) {
					return unwrap(await call(CHANNEL, "artifact/prepare-writeback", payload, signal), writebackPrepareResponseSchema);
				},
				async commitWriteback(confirmationToken, signal) {
					return unwrap(await call(CHANNEL, "artifact/commit-writeback", { confirmationToken }, signal), writebackCommitResponseSchema);
				}
			});
		}
		//#endregion
		//#region src/client/workbench-model.js
		const PANEL_MODES = /* @__PURE__ */ new Set([
			"hidden",
			"normal",
			"expanded"
		]);
		function deepFreeze(value) {
			if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
			for (const child of Object.values(value)) deepFreeze(child);
			return Object.freeze(value);
		}
		function detached(value) {
			return structuredClone(value);
		}
		function assertRecord(record) {
			const parsed = workbenchRecordSchema.safeParse(record);
			if (!parsed.success) throw new TypeError(`invalid workbench record: ${parsed.error.message}`);
		}
		function taskToPage(task) {
			return {
				pageId: task.taskId,
				title: task.title,
				workType: task.workType,
				workflowId: task.workflowId,
				workflowVersion: task.workflowVersion,
				inputRefs: detached(task.inputRefs),
				formValues: detached(task.formValues),
				professionalDraft: detached(task.professionalDraft),
				generation: detached(task.generation ?? null),
				activeRunId: task.activeRunId,
				runOrder: detached(task.runOrder),
				runs: detached(task.runs),
				remoteExecutionOrder: detached(task.remoteExecutionOrder),
				remoteExecutions: detached(task.remoteExecutions),
				createdAt: task.createdAt,
				updatedAt: task.updatedAt,
				view: task.workflowId === null ? "chooser" : "workspace"
			};
		}
		function pageToEditableTask(page) {
			return {
				taskId: page.pageId,
				title: page.title,
				workType: page.workType,
				workflowId: page.workflowId,
				workflowVersion: page.workflowVersion,
				formValues: detached(page.formValues),
				professionalDraft: detached(page.professionalDraft),
				generation: detached(page.generation ?? null),
				activeRunId: page.activeRunId,
				createdAt: page.createdAt,
				updatedAt: page.updatedAt
			};
		}
		function createInitialWorkspaceState(workspaceId, syncStatus = "idle") {
			return deepFreeze({
				workspaceId,
				revision: 0,
				syncStatus,
				syncError: null,
				conflictCurrent: null,
				panelMode: "hidden",
				activePageId: null,
				pages: [],
				catalogStatus: "idle",
				catalogError: null,
				workflows: [],
				professionalStatus: "idle",
				professionalError: null,
				professionalBootstrap: null,
				pageOperations: {}
			});
		}
		function recordToWorkspaceState(record) {
			assertRecord(record);
			return deepFreeze({
				workspaceId: record.workspaceId,
				revision: record.revision,
				syncStatus: "ready",
				syncError: null,
				conflictCurrent: null,
				panelMode: record.panelMode,
				activePageId: record.activeTaskId,
				pages: record.taskOrder.map((taskId) => taskToPage(record.tasks[taskId])),
				catalogStatus: "idle",
				catalogError: null,
				workflows: [],
				professionalStatus: "idle",
				professionalError: null,
				professionalBootstrap: null,
				pageOperations: {}
			});
		}
		function workspaceStateToDraft(state) {
			const tasks = {};
			for (const page of state.pages) tasks[page.pageId] = pageToEditableTask(page);
			return deepFreeze({
				schemaVersion: 4,
				panelMode: state.panelMode,
				activeTaskId: state.activePageId,
				taskOrder: state.pages.map((page) => page.pageId),
				tasks
			});
		}
		function createPage(state, env) {
			const pageId = env.createId();
			if (typeof pageId !== "string" || pageId.length === 0) throw new Error("createId must return a task id");
			if (state.pages.some((page) => page.pageId === pageId)) throw new Error("createId returned a duplicate task id");
			const timestamp = env.now();
			const page = {
				pageId,
				title: "新任务",
				workType: null,
				workflowId: null,
				workflowVersion: null,
				inputRefs: [],
				formValues: {},
				professionalDraft: null,
				generation: null,
				activeRunId: null,
				runOrder: [],
				runs: {},
				remoteExecutionOrder: [],
				remoteExecutions: {},
				createdAt: timestamp,
				updatedAt: timestamp,
				view: "chooser"
			};
			return {
				...state,
				activePageId: pageId,
				pages: [...state.pages, page]
			};
		}
		function initialFormValues(workflow) {
			if (!workflow || typeof workflow !== "object" || !Array.isArray(workflow.form?.fields)) throw new TypeError("select-workflow requires a workflow catalog definition");
			const values = {};
			for (const field of workflow.form.fields) values[field.fieldId] = field.control === "string-list" ? [] : "";
			return values;
		}
		function reduceWorkspaceState(state, action, env) {
			let next;
			if (action.type === "set-panel-mode") {
				if (!PANEL_MODES.has(action.panelMode)) throw new Error(`invalid panel mode: ${action.panelMode}`);
				next = state.panelMode === action.panelMode ? state : {
					...state,
					panelMode: action.panelMode
				};
			} else if (action.type === "open-panel") {
				next = state.pages.length === 0 ? createPage(state, env) : state;
				if (next.panelMode !== "normal") next = {
					...next,
					panelMode: "normal"
				};
			} else if (action.type === "create-page") next = createPage(state, env);
			else if (action.type === "select-workflow") {
				const workflow = action.workflow;
				const formValues = initialFormValues(workflow);
				if (!state.pages.some((page) => page.pageId === action.pageId)) throw new Error("unknown page");
				if (state.pages.find((page) => page.pageId === action.pageId).workflowId !== null) throw new Error("selected workflow is immutable; create a new task instead");
				next = {
					...state,
					activePageId: action.pageId,
					pages: state.pages.map((page) => page.pageId === action.pageId ? {
						...page,
						title: workflow.title,
						workType: workflow.workType,
						workflowId: workflow.workflowId,
						workflowVersion: workflow.workflowVersion,
						formValues,
						generation: workflow.executionMode === "unified-text" ? {
							inputSchemaVersion: claimsInputVersion(workflow.workflowVersion),
							source: "local-skill"
						} : null,
						updatedAt: env.now(),
						view: "workspace"
					} : page)
				};
			} else if (action.type === "set-generation-source") {
				const source = generationSourceSchema.parse(action.source);
				const page = state.pages.find((item) => item.pageId === action.pageId);
				if (!page?.generation) throw new Error("source switching requires a unified task");
				if (page.generation.source === source) return state;
				next = {
					...state,
					pages: state.pages.map((item) => item.pageId === action.pageId ? {
						...item,
						generation: {
							...item.generation,
							source
						},
						updatedAt: env.now()
					} : item)
				};
			} else if (action.type === "update-form-value") {
				const page = state.pages.find((item) => item.pageId === action.pageId);
				if (!page) throw new Error("unknown page");
				if (page.workflowId === null || !Object.hasOwn(page.formValues, action.fieldId)) throw new Error("unknown workflow form field");
				next = {
					...state,
					pages: state.pages.map((item) => item.pageId === action.pageId ? {
						...item,
						formValues: {
							...item.formValues,
							[action.fieldId]: detached(action.value)
						},
						updatedAt: env.now()
					} : item)
				};
			} else if (action.type === "select-professional-service") {
				const page = state.pages.find((item) => item.pageId === action.pageId);
				if (!page) throw new Error("unknown page");
				const sameSchema = page.professionalDraft?.selectedApiEndpoint === action.detail.name && page.professionalDraft?.selectedApiId === action.detail.id && page.professionalDraft?.schemaHash === action.detail.schemaHash;
				const formValues = Object.fromEntries(action.detail.inputFields.map((field) => [field.fieldId, sameSchema && Object.hasOwn(page.professionalDraft.formValues, field.fieldId) ? detached(page.professionalDraft.formValues[field.fieldId]) : ""]));
				next = {
					...state,
					pages: state.pages.map((item) => item.pageId === action.pageId ? {
						...item,
						professionalDraft: {
							selectedApiEndpoint: action.detail.name,
							selectedApiId: action.detail.id,
							schemaHash: action.detail.schemaHash,
							formValues,
							folderId: action.folderId,
							updatedAt: env.now()
						},
						updatedAt: env.now()
					} : item)
				};
			} else if (action.type === "update-professional-form-value") {
				const page = state.pages.find((item) => item.pageId === action.pageId);
				if (!page?.professionalDraft || !Object.hasOwn(page.professionalDraft.formValues, action.fieldId)) throw new Error("unknown professional service form field");
				next = {
					...state,
					pages: state.pages.map((item) => item.pageId === action.pageId ? {
						...item,
						professionalDraft: {
							...item.professionalDraft,
							formValues: {
								...item.professionalDraft.formValues,
								[action.fieldId]: detached(action.value)
							},
							updatedAt: env.now()
						},
						updatedAt: env.now()
					} : item)
				};
			} else if (action.type === "set-professional-folder") {
				if (!state.pages.find((item) => item.pageId === action.pageId)?.professionalDraft) throw new Error("professional service must be selected first");
				next = {
					...state,
					pages: state.pages.map((item) => item.pageId === action.pageId ? {
						...item,
						professionalDraft: {
							...item.professionalDraft,
							folderId: action.folderId,
							updatedAt: env.now()
						},
						updatedAt: env.now()
					} : item)
				};
			} else if (action.type === "rename-page") {
				const title = String(action.title).trim();
				if (title.length === 0 || title.length > 200) throw new Error("task title must contain 1 to 200 characters");
				if (!state.pages.some((page) => page.pageId === action.pageId)) throw new Error("unknown page");
				next = {
					...state,
					pages: state.pages.map((page) => page.pageId === action.pageId ? {
						...page,
						title,
						updatedAt: env.now()
					} : page)
				};
			} else if (action.type === "activate-page") {
				if (!state.pages.some((page) => page.pageId === action.pageId)) throw new Error("unknown page");
				next = state.activePageId === action.pageId ? state : {
					...state,
					activePageId: action.pageId
				};
			} else if (action.type === "activate-run") {
				const page = state.pages.find((item) => item.pageId === action.pageId);
				if (!page) throw new Error("unknown page");
				if (!Object.hasOwn(page.runs, action.runId)) throw new Error("unknown run");
				next = page.activeRunId === action.runId ? state : {
					...state,
					pages: state.pages.map((item) => item.pageId === action.pageId ? {
						...item,
						activeRunId: action.runId,
						updatedAt: env.now()
					} : item)
				};
			} else if (action.type === "close-page") {
				const index = state.pages.findIndex((page) => page.pageId === action.pageId);
				if (index < 0) return state;
				const pages = state.pages.filter((page) => page.pageId !== action.pageId);
				const fallback = pages[Math.min(index, pages.length - 1)]?.pageId ?? null;
				const pageOperations = { ...state.pageOperations };
				delete pageOperations[action.pageId];
				next = {
					...state,
					activePageId: state.activePageId === action.pageId ? fallback : state.activePageId,
					pages,
					pageOperations
				};
			} else throw new Error(`unknown workbench action: ${action.type}`);
			return next === state ? state : deepFreeze(next);
		}
		//#endregion
		//#region src/client/workbench-store.js
		const EMPTY_WORKSPACE_STATE = createInitialWorkspaceState(null);
		const EMPTY_PAGE_OPERATION = Object.freeze({
			materialPath: "",
			materialConfirmed: false,
			reviewNote: "",
			writebackDirectory: "",
			writebackConfirmed: false,
			writebackPlan: null,
			requestKey: null,
			localModelPreview: null,
			activeOperation: null,
			error: null,
			errorCode: null,
			feedback: null,
			materialsChanged: false,
			indexWarningManifest: null,
			professionalDetail: null,
			priceConfirmed: false,
			externalTransferConfirmed: false,
			runningWaterStatus: "idle",
			runningWaterObservation: null
		});
		function defaultCreateId() {
			if (typeof globalThis.crypto?.randomUUID !== "function") throw new Error("crypto.randomUUID is required to create an Oasis task");
			return globalThis.crypto.randomUUID();
		}
		function errorMessage(error) {
			return error instanceof Error ? error.message : String(error);
		}
		function createWorkbenchStore({ remote = null, connectionSettings = null, conversationDrafts = null, getGenerationSession = null, nativeFiles = null, createId = defaultCreateId, createRequestKey = defaultCreateId, clock = () => (/* @__PURE__ */ new Date()).toISOString(), workflowCatalog = null, saveDelayMs = 400, disposeDrainMs = 1e3, scheduler = globalThis } = {}) {
			if (!Number.isInteger(saveDelayMs) || saveDelayMs < 0) throw new TypeError("saveDelayMs must be a non-negative integer");
			if (typeof createRequestKey !== "function") throw new TypeError("createRequestKey must be a function");
			if (!Number.isSafeInteger(disposeDrainMs) || disposeDrainMs < 0) throw new TypeError("disposeDrainMs must be a non-negative safe integer");
			if (typeof scheduler?.setTimeout !== "function" || typeof scheduler?.clearTimeout !== "function") throw new TypeError("scheduler must provide setTimeout and clearTimeout");
			const knownWorkspaceIds = /* @__PURE__ */ new Set();
			const states = /* @__PURE__ */ new Map();
			const runtimes = /* @__PURE__ */ new Map();
			const listeners = /* @__PURE__ */ new Set();
			const controller = new AbortController();
			const pendingObservations = /* @__PURE__ */ new Map();
			const reducerEnvironment = {
				createId,
				now: clock
			};
			let closing = false;
			let disposed = false;
			let disposePromise;
			let professionalConfigurationGeneration = 0;
			function assertProfessionalConfiguration(generation = professionalConfigurationGeneration) {
				if (generation !== professionalConfigurationGeneration || connectionSettings !== null && !connectionSettings.getSnapshot().canSubmit) throw new Error("连接配置已变更或尚未就绪；请刷新目录并重新确认后再提交。");
			}
			function assertOpen() {
				if (closing || disposed) throw new Error(disposed ? "workbench store is disposed" : "workbench store is closing");
			}
			function assertKnown(workspaceId) {
				if (typeof workspaceId !== "string" || !knownWorkspaceIds.has(workspaceId)) throw new Error("action requires a known Workspace");
			}
			function runtimeFor(workspaceId) {
				let runtime = runtimes.get(workspaceId);
				if (!runtime) {
					runtime = {
						hydrationPromise: null,
						catalogPromise: null,
						professionalPromise: null,
						professionalGeneration: 0,
						drainPromise: null,
						pendingActions: [],
						pendingDraft: null,
						saveTimer: null,
						saveGeneration: 0,
						editGeneration: 0
					};
					runtimes.set(workspaceId, runtime);
				}
				return runtime;
			}
			function publish() {
				if (closing || disposed) return;
				for (const listener of [...listeners]) listener();
			}
			function setState(workspaceId, next) {
				const current = states.get(workspaceId);
				if (disposed) return current ?? EMPTY_WORKSPACE_STATE;
				if (current === next) return current;
				const frozen = Object.isFrozen(next) ? next : Object.freeze(next);
				states.set(workspaceId, frozen);
				for (const entry of pendingObservations.values()) if (entry.workspaceId === workspaceId && !frozen.pages.some((page) => page.pageId === entry.pageId)) invalidateObservation(entry);
				publish();
				return frozen;
			}
			function stateWith(current, changes) {
				return Object.freeze({
					...current,
					...changes
				});
			}
			function getCurrent(workspaceId) {
				return states.get(workspaceId) ?? initialState(workspaceId);
			}
			function initialState(workspaceId) {
				const state = createInitialWorkspaceState(workspaceId, remote === null ? "ready" : "idle");
				if (workflowCatalog === null) return state;
				return stateWith(state, {
					catalogStatus: "ready",
					catalogError: null,
					workflows: workflowCatalog.workflows,
					unifiedFixtureEnabled: workflowCatalog.unifiedFixtureEnabled === true,
					apiExecutionAvailable: workflowCatalog.apiExecutionAvailable === true,
					localGenerationEnabled: workflowCatalog.localGenerationEnabled === true,
					localGenerationKind: workflowCatalog.localGenerationKind ?? null
				});
			}
			function preserveClientState(recordState, current) {
				return stateWith(recordState, {
					catalogStatus: current.catalogStatus,
					catalogError: current.catalogError,
					workflows: current.workflows,
					unifiedFixtureEnabled: current.unifiedFixtureEnabled === true,
					apiExecutionAvailable: current.apiExecutionAvailable === true,
					localGenerationEnabled: current.localGenerationEnabled === true,
					localGenerationKind: current.localGenerationKind ?? null,
					professionalStatus: current.professionalStatus,
					professionalError: current.professionalError,
					professionalBootstrap: current.professionalBootstrap,
					pageOperations: current.pageOperations
				});
			}
			function pageFor(workspaceId, pageId) {
				const page = getCurrent(workspaceId).pages.find((item) => item.pageId === pageId);
				if (!page) throw new Error("unknown page");
				return page;
			}
			function assertInputEditable(workspaceId, pageId) {
				const page = pageFor(workspaceId, pageId);
				if (operationFor(getCurrent(workspaceId), pageId).activeOperation !== null || operationFor(getCurrent(workspaceId), pageId).generationUncertain || hasPendingUnifiedRun(page) || page.remoteExecutionOrder.some((id) => isOasisRemoteExecutionUnresolved(page.remoteExecutions[id]))) throw new Error("任务处理中或结果未确认，输入与来源已锁定");
			}
			function invalidateInputConfirmations(workspaceId, pageId) {
				updatePageOperation(workspaceId, pageId, {
					priceConfirmed: false,
					externalTransferConfirmed: false,
					requestKey: null,
					localModelPreview: null,
					apiPreview: null,
					writebackConfirmed: false,
					writebackPlan: null,
					error: null,
					errorCode: null,
					feedback: null
				});
			}
			function operationFor(state, pageId) {
				return state.pageOperations[pageId] ?? EMPTY_PAGE_OPERATION;
			}
			function updatePageOperation(workspaceId, pageId, changes) {
				assertOpen();
				assertKnown(workspaceId);
				pageFor(workspaceId, pageId);
				const current = getCurrent(workspaceId);
				const operation = Object.freeze({
					...operationFor(current, pageId),
					...changes
				});
				return setState(workspaceId, stateWith(current, { pageOperations: Object.freeze({
					...current.pageOperations,
					[pageId]: operation
				}) }));
			}
			function observationIsCurrent(entry) {
				return !closing && !disposed && !entry.controller.signal.aborted && pendingObservations.get(entry.key) === entry && knownWorkspaceIds.has(entry.workspaceId) && states.get(entry.workspaceId)?.pages.some((page) => page.pageId === entry.pageId);
			}
			function invalidateObservation(entry) {
				if (pendingObservations.get(entry.key) !== entry) return;
				pendingObservations.delete(entry.key);
				entry.controller.abort();
				const current = states.get(entry.workspaceId);
				const operation = current?.pageOperations[entry.pageId];
				if (operation?.activeOperation !== "running-water-observe") return;
				const pageOperations = { ...current.pageOperations };
				if (current.pages.some((page) => page.pageId === entry.pageId)) pageOperations[entry.pageId] = Object.freeze({
					...operation,
					activeOperation: null,
					runningWaterStatus: "idle",
					runningWaterObservation: null
				});
				else delete pageOperations[entry.pageId];
				setState(entry.workspaceId, stateWith(current, { pageOperations: Object.freeze(pageOperations) }));
			}
			function operationErrorFeedback(error) {
				const code = typeof error?.code === "string" ? error.code : null;
				if (["WRITEBACK_COMMITTED_INDEX_FAILED", "WRITEBACK_PARTIAL_PUBLISH"].includes(code)) return "index-warning";
				if (code === "MATERIAL_CHANGED") return "material-changed";
				if (code?.includes("CONFLICT") || code === "revision-conflict") return "conflict";
				return "operation-error";
			}
			function ensureRecordIdentity(workspaceId, state) {
				if (state.workspaceId !== workspaceId) throw new Error(`Workspace response identity mismatch: expected ${workspaceId}`);
				return state;
			}
			function clearScheduledSave(runtime) {
				runtime.saveGeneration += 1;
				if (runtime.saveTimer !== null) {
					scheduler.clearTimeout(runtime.saveTimer);
					runtime.saveTimer = null;
				}
			}
			function drainWorkspace(workspaceId) {
				const runtime = runtimeFor(workspaceId);
				if (runtime.drainPromise || remote === null || disposed) return runtime.drainPromise;
				runtime.drainPromise = (async () => {
					while (runtime.pendingDraft !== null && !disposed) {
						const current = getCurrent(workspaceId);
						if (current.syncStatus === "conflict" || current.syncStatus === "error") {
							runtime.pendingDraft = null;
							break;
						}
						const draft = runtime.pendingDraft;
						runtime.pendingDraft = null;
						try {
							const result = await remote.replace(workspaceId, getCurrent(workspaceId).revision, draft, controller.signal);
							if (disposed) break;
							if (result?.committed === true) {
								const committed = ensureRecordIdentity(workspaceId, recordToWorkspaceState(result.current));
								const latest = getCurrent(workspaceId);
								setState(workspaceId, stateWith(latest, {
									revision: committed.revision,
									syncStatus: latest.syncStatus === "conflict" ? "conflict" : runtime.pendingDraft !== null ? "saving" : "ready",
									syncError: null,
									conflictCurrent: latest.syncStatus === "conflict" ? latest.conflictCurrent?.revision > committed.revision ? latest.conflictCurrent : committed : null
								}));
								continue;
							}
							if (result?.committed === false && result.reason === "revision-conflict") {
								const conflictCurrent = ensureRecordIdentity(workspaceId, recordToWorkspaceState(result.current));
								runtime.pendingDraft = null;
								clearScheduledSave(runtime);
								setState(workspaceId, stateWith(getCurrent(workspaceId), {
									syncStatus: "conflict",
									syncError: null,
									conflictCurrent
								}));
								break;
							}
							throw new Error("Malformed Oasis workbench replacement result");
						} catch (error) {
							if (disposed || controller.signal.aborted) break;
							runtime.pendingDraft = null;
							clearScheduledSave(runtime);
							setState(workspaceId, stateWith(getCurrent(workspaceId), {
								syncStatus: "error",
								syncError: errorMessage(error),
								conflictCurrent: null
							}));
							break;
						}
					}
				})().finally(() => {
					runtime.drainPromise = null;
				});
				return runtime.drainPromise;
			}
			function scheduleWorkspaceSave(workspaceId, draft) {
				if (closing || disposed) return;
				const runtime = runtimeFor(workspaceId);
				runtime.pendingDraft = draft;
				clearScheduledSave(runtime);
				const generation = runtime.saveGeneration;
				const startDrain = () => {
					if (disposed || generation !== runtime.saveGeneration) return;
					runtime.saveTimer = null;
					drainWorkspace(workspaceId);
				};
				if (saveDelayMs === 0) queueMicrotask(startDrain);
				else runtime.saveTimer = scheduler.setTimeout(startDrain, saveDelayMs);
			}
			async function flushWorkspaceInternal(workspaceId) {
				assertKnown(workspaceId);
				const runtime = runtimeFor(workspaceId);
				clearScheduledSave(runtime);
				while (runtime.hydrationPromise) await runtime.hydrationPromise;
				if (runtime.pendingDraft !== null) drainWorkspace(workspaceId);
				while (runtime.drainPromise) await runtime.drainPromise;
				return getCurrent(workspaceId);
			}
			async function flushWorkspace(workspaceId) {
				assertOpen();
				return flushWorkspaceInternal(workspaceId);
			}
			function applyAuthoritativeReplacement(workspaceId, result) {
				if (result?.committed === true) {
					const current = getCurrent(workspaceId);
					const authoritative = preserveClientState(ensureRecordIdentity(workspaceId, recordToWorkspaceState(result.current)), current);
					if (current.syncStatus === "conflict" || current.revision > authoritative.revision) preserveDraftConflict(workspaceId, authoritative);
					setState(workspaceId, authoritative);
					return authoritative;
				}
				if (result?.committed === false && result.reason === "revision-conflict") {
					const conflictCurrent = ensureRecordIdentity(workspaceId, recordToWorkspaceState(result.current));
					setState(workspaceId, stateWith(getCurrent(workspaceId), {
						syncStatus: "conflict",
						syncError: null,
						conflictCurrent
					}));
					const error = /* @__PURE__ */ new Error("Workspace revision conflict");
					error.code = "revision-conflict";
					throw error;
				}
				throw new Error("Malformed Oasis workbench mutation result");
			}
			function preserveDraftConflict(workspaceId, authoritative) {
				const runtime = runtimeFor(workspaceId);
				clearScheduledSave(runtime);
				runtime.pendingDraft = null;
				const current = getCurrent(workspaceId);
				setState(workspaceId, stateWith(current, {
					syncStatus: "conflict",
					syncError: null,
					conflictCurrent: current.conflictCurrent?.revision > authoritative.revision ? current.conflictCurrent : authoritative
				}));
				const error = /* @__PURE__ */ new Error("Workspace revision conflict; local draft retained");
				error.code = "revision-conflict";
				throw error;
			}
			async function runPageOperation(workspaceId, pageId, operationName, operation, onSuccess) {
				assertOpen();
				assertKnown(workspaceId);
				pageFor(workspaceId, pageId);
				if (remote === null || typeof operation !== "function") throw new Error(`${operationName} requires the Oasis Host`);
				if (operationFor(getCurrent(workspaceId), pageId).activeOperation !== null) throw new Error("another page operation is already in progress");
				updatePageOperation(workspaceId, pageId, {
					activeOperation: operationName,
					error: null,
					errorCode: null,
					feedback: null,
					indexWarningManifest: null
				});
				try {
					await flushWorkspace(workspaceId);
					const current = getCurrent(workspaceId);
					if (current.syncStatus !== "ready") throw new Error(`Workspace is not ready for ${operationName}`);
					const editGeneration = runtimeFor(workspaceId).editGeneration;
					const result = await operation(current);
					if (closing || disposed || controller.signal.aborted) return getCurrent(workspaceId);
					if (runtimeFor(workspaceId).editGeneration !== editGeneration && result?.current) preserveDraftConflict(workspaceId, ensureRecordIdentity(workspaceId, recordToWorkspaceState(result.current)));
					const applied = applyAuthoritativeReplacement(workspaceId, result);
					updatePageOperation(workspaceId, pageId, {
						activeOperation: null,
						error: null,
						errorCode: null,
						...onSuccess ? onSuccess(applied) : {}
					});
					return applied;
				} catch (error) {
					if (!closing && !disposed && getCurrent(workspaceId).pages.some((page) => page.pageId === pageId)) {
						const feedback = operationErrorFeedback(error);
						const discardWritebackPlan = feedback === "index-warning" || operationName === "writeback-commit";
						updatePageOperation(workspaceId, pageId, {
							activeOperation: null,
							error: errorMessage(error),
							errorCode: typeof error?.code === "string" ? error.code : null,
							feedback,
							materialsChanged: feedback === "material-changed" ? true : operationFor(getCurrent(workspaceId), pageId).materialsChanged,
							writebackPlan: discardWritebackPlan ? null : operationFor(getCurrent(workspaceId), pageId).writebackPlan,
							writebackConfirmed: discardWritebackPlan ? false : operationFor(getCurrent(workspaceId), pageId).writebackConfirmed,
							indexWarningManifest: feedback === "index-warning" ? error?.details?.manifest ?? null : null
						});
					}
					throw error;
				}
			}
			function persistReadyAction(workspaceId, action) {
				assertOpen();
				const current = getCurrent(workspaceId);
				const next = reduceWorkspaceState(current, action, reducerEnvironment);
				if (next === current) return current;
				runtimeFor(workspaceId).editGeneration += 1;
				const saving = stateWith(next, {
					syncStatus: remote === null ? "ready" : "saving",
					syncError: null,
					conflictCurrent: null
				});
				setState(workspaceId, saving);
				if (remote !== null) scheduleWorkspaceSave(workspaceId, workspaceStateToDraft(saving));
				return saving;
			}
			async function hydrateWorkspace(workspaceId, { force = false } = {}) {
				assertOpen();
				assertKnown(workspaceId);
				if (remote === null) {
					const current = getCurrent(workspaceId);
					if (current.syncStatus === "idle") return setState(workspaceId, stateWith(current, { syncStatus: "ready" }));
					return current;
				}
				const runtime = runtimeFor(workspaceId);
				if (runtime.hydrationPromise) return runtime.hydrationPromise;
				const current = getCurrent(workspaceId);
				if (!force && !["idle", "loading"].includes(current.syncStatus)) return current;
				setState(workspaceId, stateWith(current, {
					syncStatus: "loading",
					syncError: null,
					conflictCurrent: null
				}));
				runtime.hydrationPromise = (async () => {
					try {
						const record = await remote.get(workspaceId, controller.signal);
						if (disposed) return getCurrent(workspaceId);
						let hydrated = preserveClientState(ensureRecordIdentity(workspaceId, recordToWorkspaceState(record)), getCurrent(workspaceId));
						const pendingActions = runtime.pendingActions.splice(0);
						for (const action of pendingActions) hydrated = reduceWorkspaceState(hydrated, action, reducerEnvironment);
						if (pendingActions.length === 0) {
							setState(workspaceId, hydrated);
							return hydrated;
						}
						const saving = stateWith(hydrated, { syncStatus: "saving" });
						setState(workspaceId, saving);
						const draft = workspaceStateToDraft(saving);
						if (closing) runtime.pendingDraft = draft;
						else scheduleWorkspaceSave(workspaceId, draft);
						return saving;
					} catch (error) {
						if (closing || disposed || controller.signal.aborted) return getCurrent(workspaceId);
						runtime.pendingActions.length = 0;
						return setState(workspaceId, stateWith(getCurrent(workspaceId), {
							syncStatus: "error",
							syncError: errorMessage(error),
							conflictCurrent: null
						}));
					} finally {
						runtime.hydrationPromise = null;
					}
				})();
				return runtime.hydrationPromise;
			}
			function dispatch(workspaceId, action) {
				assertOpen();
				assertKnown(workspaceId);
				const current = getCurrent(workspaceId);
				if (remote === null || ["ready", "saving"].includes(current.syncStatus)) return persistReadyAction(workspaceId, action);
				if (["idle", "loading"].includes(current.syncStatus)) {
					runtimeFor(workspaceId).pendingActions.push(action);
					if (action.type === "open-panel" && current.panelMode !== "normal") setState(workspaceId, stateWith(current, {
						panelMode: "normal",
						syncStatus: "loading"
					}));
					hydrateWorkspace(workspaceId);
					return getCurrent(workspaceId);
				}
				if (action.type === "open-panel" && ["conflict", "error"].includes(current.syncStatus)) return setState(workspaceId, stateWith(current, { panelMode: "normal" }));
				throw new Error(`Workspace is not writable while syncStatus is ${current.syncStatus}`);
			}
			function pageCreatedBy(action, before, after) {
				if (!["create-page", "open-panel"].includes(action.type)) return void 0;
				return after.pages.find((page) => !before.pages.some((item) => item.pageId === page.pageId));
			}
			const store = {
				websiteImportRemote: remote,
				connectionSettings,
				conversationDrafts,
				async refreshProfessionalConfiguration(reload = false) {
					if (closing || disposed) return;
					professionalConfigurationGeneration += 1;
					for (const entry of pendingObservations.values()) invalidateObservation(entry);
					const workspaceIds = [...knownWorkspaceIds];
					for (const workspaceId of workspaceIds) {
						const runtime = runtimeFor(workspaceId);
						runtime.professionalGeneration += 1;
						runtime.professionalPromise = null;
						const current = getCurrent(workspaceId);
						const pageOperations = Object.fromEntries(Object.entries(current.pageOperations).map(([pageId, operation]) => [pageId, Object.freeze({
							...operation,
							professionalDetail: null,
							localModelPreview: null,
							apiPreview: null,
							priceConfirmed: false,
							externalTransferConfirmed: false,
							runningWaterStatus: "idle",
							runningWaterObservation: null
						})]));
						setState(workspaceId, stateWith(current, {
							professionalStatus: "idle",
							professionalBootstrap: null,
							professionalError: null,
							pageOperations: Object.freeze(pageOperations)
						}));
					}
					if (reload) await Promise.all(workspaceIds.map((workspaceId) => store.loadProfessionalBootstrap(workspaceId).catch(() => null)));
				},
				syncWorkspaces(workspaceItems) {
					assertOpen();
					const nextIds = new Set(Array.isArray(workspaceItems) ? workspaceItems.map((item) => item?.workspaceId).filter((id) => typeof id === "string") : []);
					knownWorkspaceIds.clear();
					for (const id of nextIds) {
						knownWorkspaceIds.add(id);
						if (!states.has(id)) states.set(id, initialState(id));
					}
					for (const entry of pendingObservations.values()) if (!nextIds.has(entry.workspaceId)) invalidateObservation(entry);
				},
				subscribe(listener) {
					if (closing || disposed) return () => {};
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				peekWorkspaceState(workspaceId) {
					return states.get(workspaceId) ?? EMPTY_WORKSPACE_STATE;
				},
				getWorkspaceState(workspaceId) {
					assertKnown(workspaceId);
					return getCurrent(workspaceId);
				},
				hydrateWorkspace,
				async loadWorkflowCatalog(workspaceId) {
					assertOpen();
					assertKnown(workspaceId);
					const current = getCurrent(workspaceId);
					if (current.catalogStatus === "ready") return current.workflows;
					if (remote === null || typeof remote.getWorkflowCatalog !== "function") throw new Error("workflow catalog is unavailable");
					const runtime = runtimeFor(workspaceId);
					if (runtime.catalogPromise) return runtime.catalogPromise;
					setState(workspaceId, stateWith(current, {
						catalogStatus: "loading",
						catalogError: null
					}));
					runtime.catalogPromise = (async () => {
						try {
							const response = await remote.getWorkflowCatalog(void 0, controller.signal);
							if (closing || disposed) return [];
							const workflows = Array.isArray(response?.workflows) ? response.workflows : null;
							if (workflows === null) throw new Error("Malformed workflow catalog response");
							setState(workspaceId, stateWith(getCurrent(workspaceId), {
								catalogStatus: "ready",
								catalogError: null,
								workflows,
								unifiedFixtureEnabled: response.unifiedFixtureEnabled === true,
								apiExecutionAvailable: response.apiExecutionAvailable === true,
								localGenerationEnabled: response.localGenerationEnabled === true,
								localGenerationKind: response.localGenerationKind ?? null
							}));
							return workflows;
						} catch (error) {
							if (!closing && !disposed && !controller.signal.aborted) setState(workspaceId, stateWith(getCurrent(workspaceId), {
								catalogStatus: "error",
								catalogError: errorMessage(error),
								workflows: [],
								unifiedFixtureEnabled: false,
								apiExecutionAvailable: false,
								localGenerationEnabled: false,
								localGenerationKind: null
							}));
							throw error;
						} finally {
							runtime.catalogPromise = null;
						}
					})();
					return runtime.catalogPromise;
				},
				async loadProfessionalBootstrap(workspaceId) {
					assertOpen();
					assertKnown(workspaceId);
					const current = getCurrent(workspaceId);
					if (current.professionalStatus === "ready") return current.professionalBootstrap;
					if (remote === null || typeof remote.getProfessionalBootstrap !== "function") return setState(workspaceId, stateWith(current, {
						professionalStatus: "unavailable",
						professionalError: null,
						professionalBootstrap: null
					})).professionalBootstrap;
					const runtime = runtimeFor(workspaceId);
					if (runtime.professionalPromise) return runtime.professionalPromise;
					const generation = ++runtime.professionalGeneration;
					const isCurrent = () => !closing && !disposed && knownWorkspaceIds.has(workspaceId) && runtimes.get(workspaceId) === runtime && runtime.professionalGeneration === generation;
					setState(workspaceId, stateWith(current, {
						professionalStatus: "loading",
						professionalError: null
					}));
					runtime.professionalPromise = (async () => {
						try {
							const bootstrap = await remote.getProfessionalBootstrap(controller.signal);
							if (!isCurrent()) return null;
							setState(workspaceId, stateWith(getCurrent(workspaceId), {
								professionalStatus: "ready",
								professionalError: null,
								professionalBootstrap: bootstrap
							}));
							return bootstrap;
						} catch (error) {
							if (isCurrent() && !controller.signal.aborted) setState(workspaceId, stateWith(getCurrent(workspaceId), {
								professionalStatus: "error",
								professionalError: errorMessage(error),
								professionalBootstrap: null
							}));
							throw error;
						} finally {
							if (runtime.professionalGeneration === generation) runtime.professionalPromise = null;
						}
					})();
					return runtime.professionalPromise;
				},
				async reloadWorkspace(workspaceId) {
					assertOpen();
					assertKnown(workspaceId);
					const runtime = runtimeFor(workspaceId);
					runtime.pendingActions.length = 0;
					runtime.pendingDraft = null;
					clearScheduledSave(runtime);
					return hydrateWorkspace(workspaceId, { force: true });
				},
				async whenSettled(workspaceId) {
					assertOpen();
					assertKnown(workspaceId);
					const runtime = runtimeFor(workspaceId);
					while (runtime.hydrationPromise) await runtime.hydrationPromise;
					return flushWorkspace(workspaceId);
				},
				flushWorkspace,
				setPanelMode(workspaceId, panelMode) {
					return dispatch(workspaceId, {
						type: "set-panel-mode",
						panelMode
					});
				},
				setLocalPanelMode(workspaceId, panelMode) {
					assertOpen();
					assertKnown(workspaceId);
					if (!["hidden", "normal"].includes(panelMode)) throw new Error("local panel mode must be hidden or normal");
					return setState(workspaceId, stateWith(getCurrent(workspaceId), { panelMode }));
				},
				openPanel(workspaceId) {
					const before = getCurrent(workspaceId);
					const action = { type: "open-panel" };
					return pageCreatedBy(action, before, dispatch(workspaceId, action));
				},
				createPage(workspaceId) {
					const before = getCurrent(workspaceId);
					const action = { type: "create-page" };
					return pageCreatedBy(action, before, dispatch(workspaceId, action));
				},
				selectWorkflow(workspaceId, pageId, workflowId) {
					assertKnown(workspaceId);
					const current = getCurrent(workspaceId);
					if (current.catalogStatus !== "ready") throw new Error("workflow catalog is not ready");
					const workflow = current.workflows.find((item) => item.workflowId === workflowId);
					if (!workflow) throw new Error(`workflow catalog does not contain ${workflowId}`);
					dispatch(workspaceId, {
						type: "select-workflow",
						pageId,
						workflow,
						defaultGenerationSource: "local-skill"
					});
					return getCurrent(workspaceId);
				},
				updateFormValue(workspaceId, pageId, fieldId, value) {
					assertInputEditable(workspaceId, pageId);
					dispatch(workspaceId, {
						type: "update-form-value",
						pageId,
						fieldId,
						value
					});
					invalidateInputConfirmations(workspaceId, pageId);
					return getCurrent(workspaceId);
				},
				setGenerationSource(workspaceId, pageId, source) {
					assertInputEditable(workspaceId, pageId);
					const previous = pageFor(workspaceId, pageId).generation?.source;
					dispatch(workspaceId, {
						type: "set-generation-source",
						pageId,
						source
					});
					if (source !== previous) invalidateInputConfirmations(workspaceId, pageId);
					return getCurrent(workspaceId);
				},
				async selectClaimsUpstream(workspaceId, pageId, relativePath) {
					assertInputEditable(workspaceId, pageId);
					invalidateInputConfirmations(workspaceId, pageId);
					return runPageOperation(workspaceId, pageId, "upstream-select", (current) => remote.selectClaimsUpstream({
						workspaceId,
						taskId: pageId,
						expectedRevision: current.revision,
						relativePath,
						confirmed: true
					}, controller.signal), () => ({
						feedback: relativePath === null ? "已取消上游文稿" : "已确认上游文稿",
						error: null
					}));
				},
				async selectProfessionalService(workspaceId, pageId, apiEndpoint) {
					assertOpen();
					assertKnown(workspaceId);
					assertProfessionalConfiguration();
					const configurationGeneration = professionalConfigurationGeneration;
					pageFor(workspaceId, pageId);
					const bootstrap = getCurrent(workspaceId).professionalBootstrap;
					if (!bootstrap?.remoteEnabled || !bootstrap.credentialConfigured) throw new Error("Professional service runtime is not ready");
					const service = bootstrap.services.find((item) => item.apiEndpoint === apiEndpoint);
					if (!service) throw new Error("unknown professional service");
					const existingFolderId = pageFor(workspaceId, pageId).professionalDraft?.folderId;
					const folderId = bootstrap.folders.some((item) => item.id === existingFolderId) ? existingFolderId : bootstrap.folders[0]?.id;
					if (!Number.isSafeInteger(folderId)) throw new Error("Professional service requires an available project folder");
					const detail = await remote.getProfessionalDetail(apiEndpoint, controller.signal);
					assertProfessionalConfiguration(configurationGeneration);
					if (detail.id !== service.apiId || detail.name !== service.apiEndpoint) throw new Error("Professional service detail mismatch");
					const next = dispatch(workspaceId, {
						type: "select-professional-service",
						pageId,
						detail,
						folderId
					});
					updatePageOperation(workspaceId, pageId, {
						professionalDetail: detail,
						priceConfirmed: false,
						externalTransferConfirmed: false,
						error: null,
						errorCode: null,
						feedback: null
					});
					return next;
				},
				updateProfessionalFormValue(workspaceId, pageId, fieldId, value) {
					const next = dispatch(workspaceId, {
						type: "update-professional-form-value",
						pageId,
						fieldId,
						value
					});
					updatePageOperation(workspaceId, pageId, {
						priceConfirmed: false,
						externalTransferConfirmed: false
					});
					return next;
				},
				setProfessionalFolder(workspaceId, pageId, folderId) {
					const next = dispatch(workspaceId, {
						type: "set-professional-folder",
						pageId,
						folderId
					});
					updatePageOperation(workspaceId, pageId, { priceConfirmed: false });
					return next;
				},
				setProfessionalConfirmations(workspaceId, pageId, { priceConfirmed, externalTransferConfirmed }) {
					return updatePageOperation(workspaceId, pageId, {
						priceConfirmed: priceConfirmed === true,
						externalTransferConfirmed: externalTransferConfirmed === true,
						error: null,
						errorCode: null
					});
				},
				async startProfessional(workspaceId, pageId) {
					assertOpen();
					assertKnown(workspaceId);
					assertProfessionalConfiguration();
					const configurationGeneration = professionalConfigurationGeneration;
					if (!pageFor(workspaceId, pageId).professionalDraft) throw new Error("A professional service must be selected first");
					const operation = operationFor(getCurrent(workspaceId), pageId);
					if (operation.priceConfirmed !== true) throw new Error("Price confirmation is required");
					if (operation.externalTransferConfirmed !== true) throw new Error("External material transfer confirmation is required");
					if (operation.activeOperation !== null) throw new Error("another page operation is already in progress");
					const requestKey = operation.requestKey ?? createRequestKey();
					updatePageOperation(workspaceId, pageId, {
						requestKey,
						activeOperation: "professional-run",
						error: null,
						errorCode: null,
						feedback: null
					});
					try {
						await flushWorkspace(workspaceId);
						assertProfessionalConfiguration(configurationGeneration);
						const current = getCurrent(workspaceId);
						if (current.syncStatus !== "ready") throw new Error("Workspace is not ready for professional execution");
						applyAuthoritativeReplacement(workspaceId, await remote.startProfessional({
							workspaceId,
							taskId: pageId,
							expectedRevision: current.revision,
							requestKey,
							priceConfirmed: true,
							externalTransferConfirmed: true
						}, controller.signal));
						const authoritativePage = pageFor(workspaceId, pageId);
						const execution = Object.values(authoritativePage.remoteExecutions).find((item) => item.requestKey === requestKey);
						if (!execution) throw new Error("Prepared professional execution is missing");
						assertProfessionalConfiguration(configurationGeneration);
						const applied = applyAuthoritativeReplacement(workspaceId, await remote.continueProfessional({
							workspaceId,
							taskId: pageId,
							executionId: execution.executionId
						}, controller.signal));
						const finalExecution = pageFor(workspaceId, pageId).remoteExecutions[execution.executionId];
						updatePageOperation(workspaceId, pageId, {
							activeOperation: null,
							requestKey: ["completed", "failed"].includes(finalExecution.status) ? null : requestKey,
							priceConfirmed: false,
							externalTransferConfirmed: false,
							feedback: finalExecution.status === "completed" ? "professional-completed" : finalExecution.status
						});
						return applied;
					} catch (error) {
						if (!closing && !disposed) updatePageOperation(workspaceId, pageId, {
							activeOperation: null,
							error: errorMessage(error),
							errorCode: typeof error?.code === "string" ? error.code : null,
							feedback: operationErrorFeedback(error)
						});
						throw error;
					}
				},
				async continueProfessional(workspaceId, pageId, executionId) {
					assertProfessionalConfiguration();
					const configurationGeneration = professionalConfigurationGeneration;
					return runPageOperation(workspaceId, pageId, "professional-continue", () => {
						assertProfessionalConfiguration(configurationGeneration);
						return remote.continueProfessional({
							workspaceId,
							taskId: pageId,
							executionId
						}, controller.signal);
					}, (applied) => {
						const execution = applied.pages.find((item) => item.pageId === pageId)?.remoteExecutions[executionId];
						return {
							requestKey: execution && ["completed", "failed"].includes(execution.status) ? null : operationFor(applied, pageId).requestKey,
							feedback: execution?.status === "completed" ? "professional-completed" : execution?.status ?? null
						};
					});
				},
				async stopProfessional(workspaceId, pageId, executionId) {
					assertOpen();
					assertKnown(workspaceId);
					pageFor(workspaceId, pageId);
					if (remote === null || typeof remote.stopProfessional !== "function") throw new Error("Professional service requires the Oasis Host");
					return remote.stopProfessional({
						workspaceId,
						taskId: pageId,
						executionId
					}, controller.signal);
				},
				async observeRunningWater(workspaceId, pageId, runId) {
					assertOpen();
					assertKnown(workspaceId);
					pageFor(workspaceId, pageId);
					if (remote === null || typeof remote.observeRunningWater !== "function") throw new Error("Running-water observation requires the Oasis Host");
					const existing = operationFor(getCurrent(workspaceId), pageId);
					if (existing.activeOperation !== null || existing.runningWaterStatus === "loading") throw new Error("another page operation is already in progress");
					const entry = {
						key: JSON.stringify([workspaceId, pageId]),
						workspaceId,
						pageId,
						controller: new AbortController()
					};
					pendingObservations.set(entry.key, entry);
					updatePageOperation(workspaceId, pageId, {
						activeOperation: "running-water-observe",
						runningWaterStatus: "loading",
						runningWaterObservation: null,
						error: null,
						errorCode: null
					});
					try {
						if (!observationIsCurrent(entry)) return void 0;
						const observation = await remote.observeRunningWater({
							workspaceId,
							taskId: pageId,
							runId
						}, entry.controller.signal);
						if (observationIsCurrent(entry)) updatePageOperation(workspaceId, pageId, {
							activeOperation: null,
							runningWaterStatus: "ready",
							runningWaterObservation: observation
						});
						return observation;
					} catch (error) {
						if (observationIsCurrent(entry)) updatePageOperation(workspaceId, pageId, {
							activeOperation: null,
							runningWaterStatus: "error",
							runningWaterObservation: null,
							error: errorMessage(error),
							errorCode: typeof error?.code === "string" ? error.code : null
						});
						throw error;
					} finally {
						if (pendingObservations.get(entry.key) === entry) pendingObservations.delete(entry.key);
					}
				},
				setMaterialDraft(workspaceId, pageId, materialPath, confirmed) {
					return updatePageOperation(workspaceId, pageId, {
						materialPath: String(materialPath),
						materialConfirmed: confirmed === true,
						error: null,
						errorCode: null,
						feedback: null
					});
				},
				async addMaterial(workspaceId, pageId) {
					const operation = operationFor(getCurrent(workspaceId), pageId);
					if (operation.materialConfirmed !== true) throw new Error("Material confirmation is required");
					if (operation.materialPath.trim().length === 0) throw new Error("Material path is required");
					return runPageOperation(workspaceId, pageId, "material-add", (current) => remote.addMaterial({
						workspaceId,
						taskId: pageId,
						expectedRevision: current.revision,
						relativePath: operation.materialPath.trim(),
						confirmed: true
					}, controller.signal), () => ({
						materialPath: "",
						materialConfirmed: false,
						materialsChanged: false,
						feedback: "material-added"
					}));
				},
				async refreshMaterial(workspaceId, pageId, referenceId) {
					return runPageOperation(workspaceId, pageId, "material-refresh", (current) => remote.refreshMaterial({
						workspaceId,
						taskId: pageId,
						referenceId,
						expectedRevision: current.revision
					}, controller.signal), () => ({
						materialsChanged: false,
						externalTransferConfirmed: false,
						feedback: "material-refreshed"
					}));
				},
				async removeMaterial(workspaceId, pageId, referenceId, confirmed) {
					if (confirmed !== true) throw new Error("Material removal confirmation is required");
					return runPageOperation(workspaceId, pageId, "material-remove", (current) => remote.removeMaterial({
						workspaceId,
						taskId: pageId,
						referenceId,
						expectedRevision: current.revision
					}, controller.signal), () => ({
						materialsChanged: false,
						externalTransferConfirmed: false,
						feedback: "material-removed"
					}));
				},
				async createRun(workspaceId, pageId, confirmed = false) {
					const page = pageFor(workspaceId, pageId);
					if (page.generation) {
						if (page.generation.source === "oasis-api" && !getCurrent(workspaceId).unifiedFixtureEnabled && getCurrent(workspaceId).apiExecutionAvailable) return store.createApiRun(workspaceId, pageId, confirmed);
						const local = getCurrent(workspaceId).localGenerationEnabled && page.generation.source === "local-skill";
						if (!local && !getCurrent(workspaceId).unifiedFixtureEnabled) throw new Error(generationUnavailableReason(page.generation.source));
						assertInputEditable(workspaceId, pageId);
						const real = local && getCurrent(workspaceId).localGenerationKind === "native-model";
						if (real && !confirmed) {
							updatePageOperation(workspaceId, pageId, {
								activeOperation: "model-preview",
								localModelPreview: null,
								error: null
							});
							try {
								await flushWorkspace(workspaceId);
								const current = getCurrent(workspaceId);
								if (current.syncStatus !== "ready") throw new Error("请先保存材料再确认");
								const generation = runtimeFor(workspaceId).editGeneration;
								const configurationGeneration = professionalConfigurationGeneration;
								const sessionId = getGenerationSession?.(workspaceId);
								const preview = await remote.prepareLocalRun({
									workspaceId,
									taskId: pageId,
									sessionId,
									expectedRevision: current.revision
								}, controller.signal);
								if (closing || disposed) return;
								if (professionalConfigurationGeneration !== configurationGeneration || runtimeFor(workspaceId).editGeneration !== generation || getCurrent(workspaceId).revision !== current.revision || getGenerationSession?.(workspaceId) !== sessionId) throw new Error("材料或会话已变更，请重新确认");
								updatePageOperation(workspaceId, pageId, { localModelPreview: preview });
								return getCurrent(workspaceId);
							} catch (error) {
								if (!closing && !disposed) updatePageOperation(workspaceId, pageId, { error: errorMessage(error) });
								throw error;
							} finally {
								if (!closing && !disposed) updatePageOperation(workspaceId, pageId, { activeOperation: null });
							}
						}
						const preview = real ? operationFor(getCurrent(workspaceId), pageId).localModelPreview : null;
						if (real && (!preview || preview.expectedRevision !== getCurrent(workspaceId).revision || preview.sessionId !== getGenerationSession?.(workspaceId))) throw new Error("请重新确认当前模型与材料");
						const requestKey = createRequestKey();
						updatePageOperation(workspaceId, pageId, { requestKey });
						try {
							return await runPageOperation(workspaceId, pageId, "run-create", (current) => {
								const payload = {
									workspaceId,
									taskId: pageId,
									expectedRevision: current.revision,
									requestKey
								};
								return local ? remote.createLocalRun({
									...payload,
									sessionId: getGenerationSession?.(workspaceId),
									...real ? { confirmation: {
										sha256: preview.sha256,
										confirmed: true
									} } : {}
								}, controller.signal) : remote.createUnifiedRun(payload, controller.signal);
							}, () => ({
								requestKey: null,
								localModelPreview: null,
								feedback: local ? "run-prepared" : "run-completed",
								generationUncertain: false
							}));
						} catch (error) {
							const notStarted = real && [
								"GENERATION_CONFIRMATION_REQUIRED",
								"GENERATION_CONFIRMATION_STALE",
								"GENERATION_CONTEXT_UNAVAILABLE",
								"GENERATION_NOT_ENABLED",
								"BUILTIN_SKILL_UNAVAILABLE"
							].includes(error?.code);
							if (!closing && !disposed) updatePageOperation(workspaceId, pageId, {
								generationUncertain: !notStarted,
								localModelPreview: null
							});
							throw error;
						}
					}
					if (page.workflowId === null) throw new Error("A workflow must be selected before generation");
					const requestKey = operationFor(getCurrent(workspaceId), pageId).requestKey ?? createRequestKey();
					if (typeof requestKey !== "string" || requestKey.length === 0) throw new Error("createRequestKey must return a non-empty string");
					updatePageOperation(workspaceId, pageId, { requestKey });
					return runPageOperation(workspaceId, pageId, "run-create", (current) => remote.createRun({
						workspaceId,
						taskId: pageId,
						expectedRevision: current.revision,
						requestKey
					}, controller.signal), () => ({
						requestKey: null,
						materialsChanged: false,
						feedback: "run-completed"
					}));
				},
				async createApiRun(workspaceId, pageId, confirmed = false) {
					assertOpen();
					assertKnown(workspaceId);
					assertInputEditable(workspaceId, pageId);
					assertProfessionalConfiguration();
					const page = pageFor(workspaceId, pageId);
					if (!getCurrent(workspaceId).apiExecutionAvailable || page.workflowVersion !== "2" || page.generation?.source !== "oasis-api") throw new Error("当前任务不支持专业 API 执行");
					const configurationGeneration = professionalConfigurationGeneration;
					const sessionId = getGenerationSession?.(workspaceId);
					if (!confirmed) {
						updatePageOperation(workspaceId, pageId, {
							activeOperation: "api-preview",
							apiPreview: null,
							error: null,
							errorCode: null
						});
						try {
							await flushWorkspace(workspaceId);
							const current = getCurrent(workspaceId), generation = runtimeFor(workspaceId).editGeneration;
							if (current.syncStatus !== "ready") throw new Error("请先保存材料再确认");
							const binding = await remote.getWorkspaceBinding({ workspaceId }, controller.signal);
							assertProfessionalConfiguration(configurationGeneration);
							const payload = {
								workspaceId,
								taskId: pageId,
								expectedRevision: current.revision,
								expectedSettingsRevision: binding.settingsRevision
							};
							const prepared = await remote.prepareClaimsApi({
								...payload,
								remoteReadConfirmed: true
							}, controller.signal);
							const preview = await remote.previewClaimsApi({
								...payload,
								preparationSha256: prepared.preparationSha256,
								remoteReadConfirmed: true
							}, controller.signal);
							if (closing || disposed) return;
							assertProfessionalConfiguration(configurationGeneration);
							if (runtimeFor(workspaceId).editGeneration !== generation || getCurrent(workspaceId).revision !== current.revision || getGenerationSession?.(workspaceId) !== sessionId) throw new Error("材料或当前项目已变更，请重新确认");
							updatePageOperation(workspaceId, pageId, {
								apiPreview: preview,
								apiSessionId: sessionId
							});
							return getCurrent(workspaceId);
						} catch (error) {
							if (!closing && !disposed) updatePageOperation(workspaceId, pageId, {
								error: errorMessage(error),
								errorCode: error?.code ?? null,
								apiPreview: null
							});
							throw error;
						} finally {
							if (!closing && !disposed) updatePageOperation(workspaceId, pageId, { activeOperation: null });
						}
					}
					const operation = operationFor(getCurrent(workspaceId), pageId), preview = operation.apiPreview;
					if (!preview || preview.expectedRevision !== getCurrent(workspaceId).revision || Date.parse(preview.expiresAt) <= Date.now() || sessionId !== operation.apiSessionId) throw new Error("请重新核对 API 与材料，再明确确认");
					const requestKey = createRequestKey();
					let admitted = false;
					try {
						return await runPageOperation(workspaceId, pageId, "api-create", async (current) => {
							assertProfessionalConfiguration(configurationGeneration);
							if (current.revision !== preview.expectedRevision || getGenerationSession?.(workspaceId) !== sessionId) throw new Error("确认范围已改变");
							admitted = true;
							const started = await remote.startClaimsApi({
								workspaceId,
								taskId: pageId,
								expectedRevision: current.revision,
								expectedSettingsRevision: preview.expectedSettingsRevision,
								confirmationToken: preview.confirmationToken,
								requestKey,
								priceConfirmed: true,
								externalTransferConfirmed: true
							}, controller.signal);
							applyAuthoritativeReplacement(workspaceId, started);
							if (!started.committed) return started;
							const execution = Object.values(started.current.tasks[pageId].remoteExecutions).find((e) => e.requestKey === requestKey);
							if (!execution) throw new Error("API 执行检查点未确认；请查看原运行");
							assertProfessionalConfiguration(configurationGeneration);
							return remote.continueProfessional({
								workspaceId,
								taskId: pageId,
								executionId: execution.executionId
							}, controller.signal);
						}, () => ({
							apiPreview: null,
							requestKey: null,
							generationUncertain: false,
							feedback: "run-observed"
						}));
					} catch (error) {
						if (!closing && !disposed) updatePageOperation(workspaceId, pageId, {
							apiPreview: null,
							generationUncertain: admitted
						});
						throw error;
					}
				},
				setReviewNote(workspaceId, pageId, note) {
					return updatePageOperation(workspaceId, pageId, {
						reviewNote: String(note),
						error: null,
						errorCode: null,
						feedback: null
					});
				},
				async observeUnifiedRun(workspaceId, pageId) {
					return runPageOperation(workspaceId, pageId, "run-observe", async (current) => {
						const page = pageFor(workspaceId, pageId);
						const api = Object.values(page.remoteExecutions).find((e) => e.unifiedClaims && isOasisRemoteExecutionUnresolved(e));
						if (api?.submittedAt === null && ["uploading", "auth-required"].includes(api.status)) return remote.continueProfessional({
							workspaceId,
							taskId: pageId,
							executionId: api.executionId
						}, controller.signal);
						if (api?.submittedAt) {
							assertProfessionalConfiguration();
							return remote.continueProfessional({
								workspaceId,
								taskId: pageId,
								executionId: api.executionId
							}, controller.signal);
						}
						const pending = Object.values(page.runs).find((run) => run.mode === "dsh-local" && ["prepared", "unknown"].includes(run.status));
						return pending ? remote.observeLocalRun({
							workspaceId,
							taskId: pageId,
							runId: pending.runId,
							expectedRevision: current.revision
						}, controller.signal) : {
							committed: true,
							current: await remote.get(workspaceId, controller.signal)
						};
					}, () => ({
						generationUncertain: false,
						requestKey: null,
						feedback: "run-observed"
					}));
				},
				async stopUnifiedRun(workspaceId, pageId, runId) {
					if (pageFor(workspaceId, pageId).remoteExecutions[runId]?.unifiedClaims) return runPageOperation(workspaceId, pageId, "api-stop", async () => {
						await remote.stopProfessional({
							workspaceId,
							taskId: pageId,
							executionId: runId
						}, controller.signal);
						return {
							committed: true,
							current: await remote.get(workspaceId, controller.signal)
						};
					}, () => ({
						generationUncertain: false,
						apiPreview: null
					}));
					return runPageOperation(workspaceId, pageId, "run-stop", (current) => remote.stopUnifiedRun({
						workspaceId,
						taskId: pageId,
						runId,
						expectedRevision: current.revision
					}, controller.signal), () => ({
						generationUncertain: false,
						requestKey: null,
						feedback: "run-stopped"
					}));
				},
				async editUnifiedResult(workspaceId, pageId, runId, body) {
					assertInputEditable(workspaceId, pageId);
					const run = pageFor(workspaceId, pageId).runs[runId];
					if (!run || run.status !== "completed") throw new Error("请选择已完成版本");
					const requestKey = createRequestKey();
					return runPageOperation(workspaceId, pageId, "result-edit", (current) => remote.editUnifiedResult({
						workspaceId,
						taskId: pageId,
						runId,
						artifactId: run.result.artifact.artifactId,
						expectedRevision: current.revision,
						requestKey,
						body
					}, controller.signal), () => ({
						feedback: "result-edited",
						writebackPlan: null,
						writebackConfirmed: false,
						reviewNote: ""
					}));
				},
				async useInConversation(workspaceId, pageId, runId) {
					if (!conversationDrafts) throw new Error("当前对话输入接口不可用");
					const target = conversationDrafts.capture(workspaceId);
					const run = pageFor(workspaceId, pageId).runs[runId];
					if (!run?.result || run.review.status !== "approved") throw new Error("请先审核所选版本");
					await flushWorkspace(workspaceId);
					const current = getCurrent(workspaceId);
					const result = await remote.prepareConversationDraft({
						workspaceId,
						taskId: pageId,
						runId,
						artifactId: run.result.artifact.artifactId,
						expectedRevision: current.revision
					}, controller.signal);
					if (closing || disposed) return false;
					const latest = getCurrent(workspaceId);
					const page = latest.pages.find((item) => item.pageId === pageId);
					if (latest.syncStatus !== "ready" || latest.revision !== current.revision || latest.activePageId !== pageId || page?.activeRunId !== runId || page.runs[runId]?.review.status !== "approved") throw new Error("当前任务或审核版本已变化，请重新准备对话资料");
					conversationDrafts.insert(target, result);
					updatePageOperation(workspaceId, pageId, { feedback: "conversation-draft-ready" });
					return true;
				},
				async openSavedFile(workspaceId, pageId, runId, writebackId) {
					const target = nativeFiles?.captureSavedFileTarget(workspaceId);
					if (!target) throw new Error("安全文件预览不可用");
					const run = pageFor(workspaceId, pageId).runs[runId];
					if (!run?.result || run.review.status !== "approved" || !run.writebacks.some((item) => item.writebackId === writebackId)) throw new Error("请选择已审核并保存的版本");
					await flushWorkspace(workspaceId);
					const current = getCurrent(workspaceId);
					const result = await remote.resolveSavedFile({
						workspaceId,
						taskId: pageId,
						runId,
						writebackId,
						artifactId: run.result.artifact.artifactId,
						expectedRevision: current.revision
					}, controller.signal);
					if (closing || disposed) return false;
					const latest = getCurrent(workspaceId);
					const page = latest.pages.find((item) => item.pageId === pageId);
					if (latest.revision !== current.revision || latest.activePageId !== pageId || page?.activeRunId !== runId || !nativeFiles.openSavedFile(target, result)) throw new Error("当前任务或项目已变化，请重新打开文件");
					return true;
				},
				async reviewRun(workspaceId, pageId, runId, status, note) {
					const run = pageFor(workspaceId, pageId).runs[runId];
					if (!run) throw new Error("unknown run");
					const reviewNote = String(note);
					if (status === "approved" && run.result.contentStatus === "blocked") throw new Error("Blocked results cannot be approved");
					if (status === "changes-requested" && reviewNote.trim().length === 0) throw new Error("Changes-requested review requires a note");
					return runPageOperation(workspaceId, pageId, "run-review", (current) => remote.reviewRun({
						workspaceId,
						taskId: pageId,
						runId,
						expectedRevision: current.revision,
						status,
						note: reviewNote
					}, controller.signal), () => ({ feedback: status === "approved" ? "review-approved" : "review-changes-requested" }));
				},
				setWritebackDraft(workspaceId, pageId, relativeDirectory, confirmed) {
					return updatePageOperation(workspaceId, pageId, {
						writebackDirectory: String(relativeDirectory),
						writebackConfirmed: confirmed === true,
						writebackPlan: null,
						error: null,
						errorCode: null,
						feedback: null
					});
				},
				setWritebackConfirmation(workspaceId, pageId, confirmed) {
					return updatePageOperation(workspaceId, pageId, {
						writebackConfirmed: confirmed === true,
						error: null,
						errorCode: null
					});
				},
				async prepareWriteback(workspaceId, pageId, runId) {
					const run = pageFor(workspaceId, pageId).runs[runId];
					if (!run) throw new Error("unknown run");
					if (run.result.contentStatus === "blocked") throw new Error("Blocked results cannot be written back");
					if (run.review.status !== "approved") throw new Error("An approved run is required before writeback");
					const operation = operationFor(getCurrent(workspaceId), pageId);
					const relativeDirectory = ".";
					if (operation.activeOperation !== null) throw new Error("another page operation is already in progress");
					updatePageOperation(workspaceId, pageId, {
						activeOperation: "writeback-prepare",
						error: null,
						errorCode: null,
						feedback: null,
						writebackPlan: null,
						writebackConfirmed: false
					});
					try {
						await flushWorkspace(workspaceId);
						const current = getCurrent(workspaceId);
						if (current.syncStatus !== "ready") throw new Error("Workspace is not ready for writeback preparation");
						const prepared = await remote.prepareWriteback({
							workspaceId,
							taskId: pageId,
							runId,
							artifactId: run.result.artifact.artifactId,
							expectedRevision: current.revision,
							relativeDirectory
						}, controller.signal);
						if (closing || disposed || controller.signal.aborted) return prepared;
						updatePageOperation(workspaceId, pageId, {
							activeOperation: null,
							writebackPlan: prepared,
							writebackConfirmed: false,
							feedback: "writeback-prepared"
						});
						return prepared;
					} catch (error) {
						if (!closing && !disposed) updatePageOperation(workspaceId, pageId, {
							activeOperation: null,
							error: errorMessage(error),
							errorCode: typeof error?.code === "string" ? error.code : null,
							feedback: operationErrorFeedback(error)
						});
						throw error;
					}
				},
				async commitWriteback(workspaceId, pageId) {
					const operation = operationFor(getCurrent(workspaceId), pageId);
					if (!operation.writebackPlan) throw new Error("Writeback must be prepared before commit");
					if (operation.writebackConfirmed !== true) throw new Error("Writeback confirmation is required");
					const confirmationToken = operation.writebackPlan.confirmationToken;
					return runPageOperation(workspaceId, pageId, "writeback-commit", () => remote.commitWriteback(confirmationToken, controller.signal), () => ({
						writebackPlan: null,
						writebackConfirmed: false,
						feedback: "writeback-success"
					}));
				},
				renamePage(workspaceId, pageId, title) {
					return dispatch(workspaceId, {
						type: "rename-page",
						pageId,
						title
					});
				},
				activatePage(workspaceId, pageId) {
					return dispatch(workspaceId, {
						type: "activate-page",
						pageId
					});
				},
				activateRun(workspaceId, pageId, runId) {
					return dispatch(workspaceId, {
						type: "activate-run",
						pageId,
						runId
					});
				},
				closePage(workspaceId, pageId) {
					if (pageFor(workspaceId, pageId).generation) assertInputEditable(workspaceId, pageId);
					return dispatch(workspaceId, {
						type: "close-page",
						pageId
					});
				},
				dispose() {
					if (disposePromise) return disposePromise;
					closing = true;
					for (const entry of pendingObservations.values()) invalidateObservation(entry);
					const bestEffortDrains = Promise.all([...knownWorkspaceIds].map((workspaceId) => flushWorkspaceInternal(workspaceId))).catch(() => void 0);
					let deadlineTimer = null;
					const deadline = new Promise((resolveDeadline) => {
						deadlineTimer = scheduler.setTimeout(resolveDeadline, disposeDrainMs);
					});
					disposePromise = (async () => {
						try {
							await Promise.race([bestEffortDrains, deadline]);
						} finally {
							if (deadlineTimer !== null) scheduler.clearTimeout(deadlineTimer);
							deadlineTimer = null;
							controller.abort();
							disposed = true;
							for (const runtime of runtimes.values()) {
								runtime.pendingActions.length = 0;
								runtime.pendingDraft = null;
								clearScheduledSave(runtime);
								runtime.hydrationPromise = null;
								runtime.catalogPromise = null;
								runtime.professionalPromise = null;
								runtime.drainPromise = null;
							}
							knownWorkspaceIds.clear();
							states.clear();
							runtimes.clear();
							listeners.clear();
						}
					})();
					return disposePromise;
				}
			};
			return Object.freeze(store);
		}
		//#endregion
		//#region src/client/product-settings.js
		const initial = () => ({
			connected: false,
			settingsStatus: "unavailable",
			settingsWritable: false,
			environmentKind: "production",
			apiBaseUrl: OASIS_PRODUCT_ORIGIN,
			credentialOrigin: OASIS_PRODUCT_ORIGIN,
			downloadOrigins: [],
			defaultGenerationSource: "local-skill",
			outputDirectoryPrefix: "",
			credentialStatus: "unavailable",
			credentialStored: false,
			credentialConfigured: false,
			credentialWritable: false,
			accountId: null,
			accountRevision: null,
			retryAfterSeconds: 0,
			busy: false,
			restartRequired: false,
			canSubmit: false,
			error: null,
			notice: null
		});
		function createProductSettings({ remote, onInvalidated = () => {} }) {
			let snapshot = Object.freeze(initial());
			const listeners = /* @__PURE__ */ new Set();
			let scope, generation = 0, readId = 0, disposed = false, pending = false;
			let detach = () => {};
			const invalidate = () => {
				try {
					Promise.resolve(onInvalidated({ reload: false })).catch(() => {});
				} catch {}
			};
			function publish(patch) {
				if (disposed) return;
				const next = {
					...snapshot,
					...patch
				};
				next.canSubmit = next.connected && next.settingsStatus === "ready" && next.credentialConfigured && !next.busy && !next.restartRequired;
				snapshot = Object.freeze(next);
				for (const listener of listeners) listener();
			}
			function readSettings() {
				try {
					const view = scope?.getSnapshot();
					if (view?.status !== "ready" || view.mode !== "host") throw Error();
					publish({
						settingsStatus: "ready",
						settingsWritable: snapshot.connected && view.writable === true
					});
				} catch {
					publish({
						settingsStatus: "unavailable",
						settingsWritable: false
					});
				}
			}
			function receive(result) {
				const value = accountStatusSchema.parse(result);
				if (snapshot.accountRevision !== value.revision) invalidate();
				publish({
					credentialStatus: "ready",
					credentialConfigured: value.authenticated,
					credentialStored: value.authenticated,
					credentialWritable: value.available && value.writable,
					accountId: value.accountId,
					accountRevision: value.revision,
					retryAfterSeconds: value.retryAfterSeconds
				});
			}
			async function refresh() {
				readSettings();
				if (!snapshot.connected) return false;
				const current = generation, id = ++readId;
				try {
					const value = await remote.accountStatus();
					if (disposed || current !== generation || id !== readId) return false;
					receive(value);
					return true;
				} catch {
					if (!disposed && current === generation && id === readId) publish({
						credentialStatus: "error",
						credentialConfigured: false,
						credentialWritable: false
					});
					return false;
				}
			}
			async function action(method, payload) {
				if (disposed || pending || !snapshot.connected || !snapshot.credentialWritable) return false;
				const current = generation;
				pending = true;
				++readId;
				publish({
					busy: true,
					error: null,
					notice: null
				});
				if (method !== "accountSms") invalidate();
				try {
					const result = await remote[method](payload);
					if (disposed || current !== generation) return false;
					receive(result);
					publish({ notice: method === "accountSms" ? "验证码已发送，请查看手机。" : method === "accountLogout" ? "已退出本插件账户；未退出网站。" : "登录成功。可在工作台“从网站导入”中选择项目和文件。" });
					return true;
				} catch (error) {
					if (!disposed && current === generation) {
						await refresh();
						publish({ error: error?.code === "SMS_COOLDOWN" ? "请稍候再发送验证码。" : "账户操作未完成，请检查手机号、验证码或密码；不会自动重试。" });
					}
					return false;
				} finally {
					pending = false;
					publish({ busy: false });
				}
			}
			return Object.freeze({
				getSnapshot: () => snapshot,
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				bind(services) {
					detach();
					const disposers = [];
					let active = true;
					detach = () => {
						if (!active) return;
						active = false;
						generation++;
						readId++;
						for (const fn of disposers) fn();
						scope = null;
						publish({
							...initial(),
							busy: pending,
							restartRequired: snapshot.restartRequired
						});
						invalidate();
					};
					try {
						const connection = services.connection;
						if (!connection?.isLoopback || !services.remote?.$host?.isLoopback) throw Error();
						scope = services.settingsScope.bind({ namespace: "oasis-professional-service" });
						const onHost = () => {
							generation++;
							readId++;
							publish({
								connected: connection.generation.getSnapshot() != null,
								credentialConfigured: false,
								credentialWritable: false
							});
							invalidate();
							refresh();
						};
						disposers.push(scope.subscribe(() => {
							readSettings();
							invalidate();
						}), connection.generation.subscribe(onHost));
						if (services.remote.$on) disposers.push(services.remote.$on("credentials/record-updated", (key) => {
							if (key === "oasis-professional-service/website-account") {
								invalidate();
								refresh();
							}
						}));
						onHost();
					} catch {
						detach();
					}
					return detach;
				},
				refresh,
				login: (payload) => action("accountLogin", payload),
				sendSms: (payload) => action("accountSms", payload),
				logout: () => action("accountLogout", { confirmed: true }),
				dispose() {
					detach();
					disposed = true;
					listeners.clear();
				}
			});
		}
		//#endregion
		//#region src/client/OasisSettingsSection.js
		function GenerationGuidance() {
			return (0, react.createElement)("div", { style: {
				display: "grid",
				gap: 10
			} }, (0, react.createElement)("small", null, "新任务默认使用本地 Skills，通过 DSH 当前会话所选模型生成；如需专业 API，可在任务中切换并登录绿洲账户。"), (0, react.createElement)("small", null, "两种方式的结果均保存到当前 DSH 项目目录，使用 DSH 文件管理查看和编辑。Skills 生成的文件名不加来源标记，专业 API 文件名在扩展名前添加 _OIW。"), (0, react.createElement)("small", null, "使用云端模型或专业 API 时，相关材料会发送至对应服务，可能产生费用；生成前会提示并由你确认。"));
		}
		function OasisSettingsSection({ controller }) {
			return (0, react.createElement)("section", {
				"data-testid": "oasis-settings-section",
				"aria-label": "绿洲工作台设置",
				style: {
					display: "grid",
					gap: 12,
					minWidth: 0
				}
			}, (0, react.createElement)("h2", { style: {
				margin: 0,
				fontSize: 18
			} }, "绿洲工作台"), (0, react.createElement)(GenerationGuidance), controller ? (0, react.createElement)(OasisAccountSettings, { controller }) : null);
		}
		//#endregion
		//#region src/client/conversation-draft-bridge.js
		function createConversationDraftBridge(getContext) {
			const entries = /* @__PURE__ */ new Map();
			const consumed = /* @__PURE__ */ new WeakSet();
			const listeners = /* @__PURE__ */ new Set();
			let revision = 0;
			function notify() {
				revision += 1;
				for (const listener of listeners) listener();
			}
			function current(workspaceId) {
				const context = getContext();
				if (context?.status !== "ready" || resolveWorkspaceId(context.currentSessionId, context.workspaceItems) !== workspaceId) throw new Error("当前会话与项目已变化");
				const entry = entries.get(context.currentSessionId);
				if (!entry || entry.workspaceId !== workspaceId) throw new Error("当前对话输入接口不可用");
				return entry;
			}
			function empty(entry) {
				const input = entry.read();
				if (input?.phase !== "plain" || input.draft !== "" || input.imageIds?.length !== 0 || input.occurrences?.length !== 0) throw new Error("当前对话已有草稿或正在提交；不会覆盖");
				return input;
			}
			return Object.freeze({
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				getSnapshot() {
					return revision;
				},
				notify,
				unavailableReason(workspaceId) {
					try {
						empty(current(workspaceId));
						return null;
					} catch (error) {
						return error.message;
					}
				},
				register(entry) {
					if (typeof entry?.inputActions?.setDraft !== "function" || typeof entry.read !== "function") return () => {};
					entries.set(entry.sessionId, entry);
					notify();
					return () => {
						if (entries.get(entry.sessionId) === entry) {
							entries.delete(entry.sessionId);
							notify();
						}
					};
				},
				capture(workspaceId) {
					const entry = current(workspaceId);
					return Object.freeze({
						entry,
						workspaceId,
						draftRev: empty(entry).draftRev
					});
				},
				insert(target, result) {
					if (consumed.has(target)) throw new Error("此草稿已准备，不会重复插入");
					const entry = current(target.workspaceId);
					if (entry !== target.entry) throw new Error("会话输入接口已切换");
					if (empty(entry).draftRev !== target.draftRev) throw new Error("对话草稿已变化");
					if (result.workspaceId !== target.workspaceId || typeof result.text !== "string" || !result.text || result.text.length > 15e4) throw new Error("结果资料与目标项目不匹配");
					consumed.add(target);
					entry.inputActions.setDraft(result.text);
				},
				dispose() {
					entries.clear();
					listeners.clear();
				}
			});
		}
		//#endregion
		//#region src/client.js
		const inject = ["slots", "connection"];
		const ENTRY_ID = "oasis-professional-entry";
		const PANEL_ID = "oasis-professional-panel";
		const SETTINGS_ID = "oasis-professional-settings";
		function apply$1(ctx, { markdownRenderer } = {}) {
			const slots = ctx.get?.("slots") ?? ctx.slots;
			const connection = ctx.get?.("connection") ?? ctx.connection;
			if (slots === void 0 || connection === void 0) return () => {};
			const remote = createWorkbenchRemote(connection);
			const connectionSettings = createProductSettings({
				remote,
				onInvalidated: ({ reload }) => store.refreshProfessionalConfiguration(reload)
			});
			const focusTargets = /* @__PURE__ */ new Map();
			const layoutAdapter = createLayoutAdapter();
			const coordinator = createPanelHostCoordinator({ layoutAdapter });
			const conversationDrafts = createConversationDraftBridge(() => coordinator.getSnapshot().workspaceContext);
			const store = createWorkbenchStore({
				remote,
				connectionSettings,
				conversationDrafts,
				nativeFiles: coordinator,
				getGenerationSession(workspaceId) {
					const context = coordinator.getSnapshot().workspaceContext;
					if (context?.status !== "ready" || resolveWorkspaceId(context.currentSessionId, context.workspaceItems) !== workspaceId) throw new Error("当前项目与会话不可用");
					return context.currentSessionId;
				}
			});
			const betterSidebarDescriptor = createOasisBetterSidebarDescriptor({
				markdownRenderer,
				coordinator,
				store,
				focusTargets,
				layoutAdapter
			});
			const disposeEntry = slots.inject("conversation.input.right", () => slots.register({
				name: "conversation.input.right",
				id: ENTRY_ID,
				order: 80,
				label: "Oasis professional workbench"
			}, (props) => (0, react.createElement)(WorkbenchEntry, {
				...props,
				store,
				focusTargets,
				layoutAdapter,
				coordinator
			})));
			const disposeBridge = slots.inject("shell.overlay", () => slots.register({
				name: "shell.overlay",
				id: PANEL_ID,
				order: 80,
				label: "Oasis professional panel"
			}, (props) => (0, react.createElement)(WorkspaceContextBridge, {
				...props,
				store,
				focusTargets,
				layoutAdapter,
				coordinator
			})));
			const disposeSettingsSection = slots.inject("settings.section", () => slots.register({
				name: "settings.section",
				id: SETTINGS_ID,
				order: 80,
				label: "绿洲工作台"
			}, (props) => (0, react.createElement)(OasisSettingsSection, {
				...props,
				controller: connectionSettings,
				remote,
				coordinator
			})));
			let betterSidebarFiber = null;
			let settingsFiber = null;
			if (typeof ctx.inject === "function") {
				try {
					settingsFiber = ctx.inject(["settingsScope", "remote.credentials"], (injectedCtx) => connectionSettings.bind({
						settingsScope: injectedCtx.get?.("settingsScope") ?? injectedCtx.settingsScope,
						remote: injectedCtx.get?.("remote") ?? injectedCtx.remote,
						connection
					}));
				} catch {}
				try {
					coordinator.expectBetterSidebar();
					betterSidebarFiber = ctx.inject(["betterSidebar"], (injectedCtx) => {
						const betterSidebar = injectedCtx.get?.("betterSidebar") ?? injectedCtx.betterSidebar;
						return coordinator.attachBetterSidebar(betterSidebar, betterSidebarDescriptor, injectedCtx);
					});
					if (typeof betterSidebarFiber?.dispose !== "function") coordinator.block("better-sidebar-injection-disposer-invalid");
				} catch {
					coordinator.block("better-sidebar-injection-failed");
				}
			} else coordinator.reconcileExternalState();
			return async () => {
				try {
					await disposeSettingsSection();
				} finally {
					try {
						await disposeBridge();
					} finally {
						try {
							await disposeEntry();
						} finally {
							try {
								await betterSidebarFiber?.dispose?.();
							} finally {
								try {
									coordinator.dispose();
								} finally {
									try {
										layoutAdapter.dispose();
									} finally {
										try {
											await settingsFiber?.dispose?.();
										} finally {
											connectionSettings.dispose();
											conversationDrafts.dispose();
											await store.dispose();
										}
									}
								}
							}
						}
					}
				}
			};
		}
		//#endregion
		//#region src/client-entry.js
		function apply(ctx) {
			return apply$1(ctx, { markdownRenderer: _deepseek_ai_dsh_client_ui_primitives.MarkdownText });
		}
		//#endregion
		exports.apply = apply;
		exports.createConversationDraftBridge = createConversationDraftBridge;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map