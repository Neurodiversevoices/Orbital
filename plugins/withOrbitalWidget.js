const { withEntitlementsPlist, withInfoPlist, withXcodeProject, withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const APP_GROUP = 'group.com.erparris.orbital';
const URL_SCHEME = 'orbital';
const WIDGET_BUNDLE_ID = 'com.erparris.orbital.widget';
const WIDGET_NAME = 'OrbitalWidget';

function withAppGroupEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [APP_GROUP];
    return config;
  });
}

function withURLScheme(config) {
  return withInfoPlist(config, (config) => {
    const existingSchemes = config.modResults.CFBundleURLTypes || [];
    const hasScheme = existingSchemes.some(
      (scheme) => scheme.CFBundleURLSchemes && scheme.CFBundleURLSchemes.includes(URL_SCHEME)
    );

    if (!hasScheme) {
      config.modResults.CFBundleURLTypes = [
        ...existingSchemes,
        {
          CFBundleURLName: 'com.erparris.orbital',
          CFBundleURLSchemes: [URL_SCHEME],
        },
      ];
    }
    return config;
  });
}

function withWidgetExtension(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const platformProjectRoot = config.modRequest.platformProjectRoot;

    const widgetSourcePath = path.join(projectRoot, 'ios', 'OrbitalWidget');
    const widgetTargetPath = path.join(platformProjectRoot, 'OrbitalWidget');

    if (!fs.existsSync(widgetTargetPath)) {
      fs.mkdirSync(widgetTargetPath, { recursive: true });
    }

    const widgetSwiftPath = path.join(widgetSourcePath, 'OrbitalWidget.swift');
    if (fs.existsSync(widgetSwiftPath)) {
      fs.copyFileSync(widgetSwiftPath, path.join(widgetTargetPath, 'OrbitalWidget.swift'));
    }

    const targetName = WIDGET_NAME;
    const targetUuid = xcodeProject.generateUuid();
    const productUuid = xcodeProject.generateUuid();
    const buildConfigurationListUuid = xcodeProject.generateUuid();
    const debugBuildConfigUuid = xcodeProject.generateUuid();
    const releaseBuildConfigUuid = xcodeProject.generateUuid();
    const sourcesBuildPhaseUuid = xcodeProject.generateUuid();
    const frameworksBuildPhaseUuid = xcodeProject.generateUuid();
    const resourcesBuildPhaseUuid = xcodeProject.generateUuid();
    const mainGroupUuid = xcodeProject.generateUuid();
    const swiftFileUuid = xcodeProject.generateUuid();
    const swiftBuildFileUuid = xcodeProject.generateUuid();
    const containerItemProxyUuid = xcodeProject.generateUuid();
    const targetDependencyUuid = xcodeProject.generateUuid();
    const copyFilesBuildPhaseUuid = xcodeProject.generateUuid();
    const copyBuildFileUuid = xcodeProject.generateUuid();

    const mainProject = xcodeProject.getFirstProject();
    const mainTarget = xcodeProject.getFirstTarget();

    if (!xcodeProject.pbxGroupByName(targetName)) {
      const widgetGroup = xcodeProject.addPbxGroup(
        ['OrbitalWidget.swift'],
        targetName,
        targetName
      );

      const mainGroup = xcodeProject.getPBXGroupByKey(mainProject.firstProject.mainGroup);
      if (mainGroup && mainGroup.children) {
        mainGroup.children.push({
          value: widgetGroup.uuid,
          comment: targetName,
        });
      }
    }

    const existingTarget = xcodeProject.pbxTargetByName(targetName);
    if (!existingTarget) {
      const commonBuildSettings = {
        ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
        ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: 'WidgetBackground',
        CLANG_ANALYZER_NONNULL: 'YES',
        CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: 'YES_AGGRESSIVE',
        CLANG_CXX_LANGUAGE_STANDARD: '"gnu++20"',
        CLANG_ENABLE_OBJC_WEAK: 'YES',
        CLANG_WARN_DOCUMENTATION_COMMENTS: 'YES',
        CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: 'YES',
        CLANG_WARN_UNGUARDED_AVAILABILITY: 'YES_AGGRESSIVE',
        CODE_SIGN_STYLE: 'Automatic',
        CURRENT_PROJECT_VERSION: '1',
        DEVELOPMENT_TEAM: '2KM3QL4UMV',
        GENERATE_INFOPLIST_FILE: 'YES',
        INFOPLIST_FILE: `${targetName}/Info.plist`,
        INFOPLIST_KEY_CFBundleDisplayName: 'Orbital',
        INFOPLIST_KEY_NSHumanReadableCopyright: '',
        LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
        MARKETING_VERSION: '1.0',
        PRODUCT_BUNDLE_IDENTIFIER: WIDGET_BUNDLE_ID,
        PRODUCT_NAME: '"$(TARGET_NAME)"',
        SKIP_INSTALL: 'YES',
        SWIFT_EMIT_LOC_STRINGS: 'YES',
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: '"1,2"',
        IPHONEOS_DEPLOYMENT_TARGET: '15.1',
        CODE_SIGN_ENTITLEMENTS: `${targetName}/${targetName}.entitlements`,
      };

      xcodeProject.addTarget(targetName, 'app_extension', targetName, WIDGET_BUNDLE_ID, {
        ...commonBuildSettings,
        DEBUG_INFORMATION_FORMAT: 'dwarf',
        MTL_ENABLE_DEBUG_INFO: 'INCLUDE_SOURCE',
        SWIFT_ACTIVE_COMPILATION_CONDITIONS: 'DEBUG',
        SWIFT_OPTIMIZATION_LEVEL: '-Onone',
      }, {
        ...commonBuildSettings,
        COPY_PHASE_STRIP: 'NO',
        DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
        SWIFT_OPTIMIZATION_LEVEL: '-Owholemodule',
      });
    }

    const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Orbital</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>`;

    fs.writeFileSync(path.join(widgetTargetPath, 'Info.plist'), infoPlistContent);

    const widgetEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP}</string>
    </array>
</dict>
</plist>`;

    fs.writeFileSync(path.join(widgetTargetPath, `${targetName}.entitlements`), widgetEntitlements);

    return config;
  });
}

function withOrbitalWidget(config) {
  config = withAppGroupEntitlement(config);
  config = withURLScheme(config);
  config = withWidgetExtension(config);
  return config;
}

module.exports = withOrbitalWidget;
