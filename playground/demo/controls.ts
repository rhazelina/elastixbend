export interface ControlSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** When present the control renders as a select instead of a slider. */
  choices?: Array<{ label: string; value: number }>;
}

export interface ControlState {
  [key: string]: number;
}

/**
 * Minimal control panel. It exists to tune the feel, so it deliberately
 * recreates the instance on change: options are read once at mount, and
 * hot-swapping them would hide the cost of a real remount.
 */
export function mountControls(
  host: HTMLElement,
  specs: ControlSpec[],
  onChange: (state: ControlState) => void,
): void {
  const state: ControlState = {};
  const form = document.createElement("form");
  form.className = "controls";
  form.setAttribute("aria-label", "Parameter");

  for (const spec of specs) {
    state[spec.key] = spec.value;

    const field = document.createElement("label");
    field.className = "control";

    const name = document.createElement("span");
    name.textContent = spec.label;

    const value = document.createElement("output");
    value.textContent = format(spec.value);

    if (spec.choices) {
      const select = document.createElement("select");
      select.name = spec.key;
      for (const choice of spec.choices) {
        const option = document.createElement("option");
        option.value = String(choice.value);
        option.textContent = choice.label;
        option.selected = choice.value === spec.value;
        select.append(option);
      }
      select.addEventListener("change", () => {
        const next = Number(select.value);
        state[spec.key] = next;
        value.textContent = choices(spec, next);
        onChange({ ...state });
      });
      field.append(name, value, select);
      form.append(field);
      continue;
    }

    const input = document.createElement("input");
    input.type = "range";
    input.name = spec.key;
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    input.value = String(spec.value);
    input.addEventListener("input", () => {
      const next = Number(input.value);
      state[spec.key] = next;
      value.textContent = format(next);
      onChange({ ...state });
    });

    field.append(name, value, input);
    form.append(field);
  }

  host.append(form);
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function choices(spec: ControlSpec, value: number): string {
  return spec.choices?.find((choice) => choice.value === value)?.label ?? format(value);
}
