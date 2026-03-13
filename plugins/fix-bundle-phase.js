const { withXcodeProject } = require('@expo/config-plugins');

module.exports = function fixBundlePhase(config) {
  return withXcodeProject(config, (config) => {
    const proj = config.modResults;
    const scripts = proj.hash.project.objects.PBXShellScriptBuildPhase || {};
    for (const key of Object.keys(scripts)) {
      const phase = scripts[key];
      if (phase.shellScript && typeof phase.shellScript === 'string') {
        phase.shellScript = phase.shellScript
          .replace(/\$SRCROOT(?!")/g, '"$SRCROOT"')
          .replace(/\$PROJECT_DIR(?!")/g, '"$PROJECT_DIR"');
      }
    }
    return config;
  });
};
