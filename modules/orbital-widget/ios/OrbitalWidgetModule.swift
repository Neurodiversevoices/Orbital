import ExpoModulesCore
import WidgetKit

public class OrbitalWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OrbitalWidget")

    Function("updateWidgetColor") { (color: String) -> Bool in
      guard ["cyan", "amber", "red"].contains(color) else {
        return false
      }

      let sharedDefaults = UserDefaults(suiteName: "group.com.erparris.orbital")
      sharedDefaults?.set(color, forKey: "orbital_capacity_color")
      sharedDefaults?.synchronize()

      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }

      return true
    }

    Function("getWidgetColor") { () -> String? in
      let sharedDefaults = UserDefaults(suiteName: "group.com.erparris.orbital")
      return sharedDefaults?.string(forKey: "orbital_capacity_color")
    }

    Function("reloadWidget") { () -> Void in
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
