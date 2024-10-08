import vega from "vega";
import { container as vegaEmbed } from "vega-embed";

const getSignals = (view) => {
  const state = view.getState({
    data: vega.falsy,
    signals: vega.truthy,
    recurse: true,
  });
  // console.log("signals", state.signals);
  return Object.keys(state.signals);
  // .filter((d) => d !== "unit"); // Terrible hack due to my ignorance 🤷
};

async function vegaSelected(
  spec,
  {
    vegaConfig = {},
    signal = null, // provide a signal name to listen just to that one
    invalidation = new Promise(() => {}), // for observable
  } = {}
) {
  let view = null;
  const chart = await vegaEmbed(spec, vegaConfig);
  // The vega view;
  view = chart.value;

  let internalValue = {};

  const setValue = (newVal) => {
    chart.value = newVal;
    chart.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // Listen to events on the vega-lite view
  const signaled = (name, value) => {
    // console.log("signal", signal, "name, value", name, value);
    if (signal) {
      if (signal === name) internalValue = value;
    } else {
      if (value === null || Object.keys(value).length === 0) {
        //empty object
        delete internalValue[name];
      } else {
        internalValue[name] = value;
      }
    }

    setValue(internalValue);
  };

  const signals = getSignals(view);
  // console.log("signals", signals);
  signals.map((signal) => {
    view.addSignalListener(signal, signaled);
  });

  invalidation.then(() => {
    if (!view) return;
    signals.map((signal) => view.removeSignalListener(signal, signaled));
  });

  // 🧰 The value attribute represents the current interaction
  Object.defineProperty(chart, "value", {
    get() {
      return internalValue;
    },
    async set(newValue) {
      internalValue = newValue;
      if (signal) {
        // ⚠️ Experimental, trying to send a signal back to vegaLite
        view.signal(signal, internalValue);
        await view.runAsync();
      }
    },
  });

  // chart.value = internalValue;
  chart.view = view;

  return chart;
}

export default vegaSelected;
