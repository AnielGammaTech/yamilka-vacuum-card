import {
  HassEntityAttributeBase,
  HassEntityBase,
  HassServiceTarget,
} from 'home-assistant-js-websocket';
import { TemplateResult, nothing } from 'lit';

export * from 'home-assistant-js-websocket';

export type TemplateNothing = typeof nothing;
export type Template = TemplateResult | TemplateNothing;

export type VacuumEntityState =
  | 'cleaning'
  | 'docked'
  | 'idle'
  | 'paused'
  | 'returning'
  | 'error'
  | 'unknown'
  | string; // for other states

export interface VacuumEntityAttributes extends HassEntityAttributeBase {
  status?: VacuumEntityState;
  state?: VacuumEntityState;
  fan_speed?: string;
  fan_speed_list?: string[];
  battery_level?: number;
  battery_icon?: string;
}

export interface VacuumEntity extends HassEntityBase {
  attributes: VacuumEntityAttributes;
  state: VacuumEntityState;
}

export interface VacuumBatteryEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase;
}

export interface VacuumCardStat {
  entity_id?: string;
  attribute?: string;
  icon?: string;
  value_template?: string;
  unit?: string;
  subtitle?: string;
}

export type VacuumCardMapMode = 'drawer' | 'side' | 'replace' | 'hidden';

export interface VacuumCardAction {
  service: string;
  service_data?: Record<string, unknown>;
  target?: HassServiceTarget;
}

export interface VacuumCardShortcut {
  name?: string;
  icon?: string;
  service?: string;
  service_data?: Record<string, unknown>;
  target?: HassServiceTarget;
}

export type VacuumCardSetting =
  | string
  | {
      type?: 'section';
      label?: string;
      entity?: string;
      entity_id?: string;
      name?: string;
      icon?: string;
    };

export interface VacuumCardConfig {
  entity: string;
  battery_entity: string;
  map: string;
  map_mode: VacuumCardMapMode;
  map_refresh: number;
  image: string;
  card_width: string;
  show_name: boolean;
  show_status: boolean;
  show_toolbar: boolean;
  show_map_toggle: boolean;
  show_header_stats: boolean;
  compact_view: boolean;
  header_stats: VacuumCardStat[];
  stats: Record<string, VacuumCardStat[]>;
  actions: Record<string, VacuumCardAction>;
  shortcuts: VacuumCardShortcut[];
  settings: VacuumCardSetting[];
}

export interface VacuumServiceCallParams {
  request: boolean;
}

export interface VacuumActionParams extends VacuumServiceCallParams {
  defaultService?: string;
}
