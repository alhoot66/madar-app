// يمنع ظهور نافذة سطر أوامر إضافية في ويندوز
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    madar_lib::run()
}
