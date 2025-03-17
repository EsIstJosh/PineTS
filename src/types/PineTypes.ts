// SPDX-License-Identifier: AGPL-3.0-only

type PlotCharOptions = {
    title?: string;
    char?: string;
    location?: string;
    color?: string;
    offset?: number;
    text?: string;
    textcolor?: string;
    editable?: boolean;
    size?: number;
    show_last?: boolean;
    display?: boolean;
    format?: string;
    precision?: number;
    force_overlay?: boolean;
};

type PlotOptions = {
    color?: string;
    linewidth?: number;
    style?: string;
    trackprice?: boolean;
    histbase?: boolean;
    offset?: number;
    join?: boolean;
    editable?: boolean;
    show_last?: boolean;
    display?: boolean;
    format?: string;
    precision?: number;
    force_overlay?: boolean;
    group?:string;

};

type IndicatorOptions = {
    overlay?: boolean;
    format?: string;
    precision?: number;
    scale?: number;
    max_bars_back?: number;
    timeframe?: string;
    timeframe_gaps?: boolean;
    explicit_plot_zorder?: number;
    max_lines_count?: number;
    max_labels_count?: number;
    max_boxes_count?: number;
    calc_bars_count?: number;
    max_polylines_count?: number;
    dynamic_requests?: boolean;
    behind_chart?: boolean;

};
 type PlotCandleOptions = {
    color?: string | string[];   
    // The wick color(s). Can be a 
    wickcolor?: string | string[];
    editable?: boolean;           
    show_last?: number;           
    // The border color(s) for the 
    bordercolor?: string | string[]
    display?: boolean;            
    format?: string;              
    precision?: number;           
    force_overlay?: boolean;  
    group?:string;
  }

   type PlotBarOptions = {
    // The bar's color(s). Can be a
    color?: string | string[];   
    editable?: boolean;           
    show_last?: number;           
    display?: boolean;            
    format?: string;              
    precision?: number;           
    force_overlay?: boolean;   
    group?:string;
  };


   type FillOptions = {
    color?: string;
    title?: string;
    editable?: boolean;
    show_last?: boolean;
    fillgaps?: boolean;
    display?: boolean;
    }