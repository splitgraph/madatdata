module.exports = {
  name: `pin-deps`,
  factory: (require) => {
    const { BaseCommand} = require(`@yarnpkg/cli`);

    const core = require(`@yarnpkg/core`);
    const semver = require(`semver`);

    const {
      Cache,
      Project,
      Configuration,
      ThrowReport,
      StreamReport,
      semverUtils,
      structUtils,
      Manifest,
    } = core;

    const { getPluginConfiguration, } = require("@yarnpkg/cli");
    const { Command, Option } = require("clipanion")
    const { ppath } = require("@yarnpkg/fslib");

    const green = (text) => `\x1b[32m${text}\x1b[0m`;
    const yellow = (text) => `\x1b[33m${text}\x1b[0m`;

    const pRef = (pkg, opts) => {
      const { scope, name, range } = pkg;
      const { highlight } = opts ?? {};

      const identity = (x) => x;

      const hi = {
        all: typeof highlight === "function" ? highlight : identity,
        range: highlight?.range ?? identity,
        name: highlight?.name ?? identity,
        scope: highlight?.scope ?? identity,
      };

      return hi.all(
        `${scope ? `@${hi.scope(scope)}/` : ""}${hi.name(name)}:${hi.range(
          range
        )}`
      );
    };

    class PinDepsCommand extends BaseCommand {
      static paths = [["pin-deps"]]

      dryRun = Option.Boolean("--dry", {
        description: "Print the changes to stdout but do not apply them to package.json files."
      })

      onlyDevDependencies = Option.Boolean("--only-dev", {
        description: "Only devDependencies"
      })

      ignoreDevDependencies = Option.Boolean("--ignore-dev", {
        description: "Ignore devDependencies (default is false, to pin dependencies and devDependencies)."
      })


      verbose = Option.Boolean("--verbose", {
        description: "Print more information about skipped or already pinned packages"
      })

      onlyPackages = Option.Array("--only", {
        description: `To _only_ include a specific name:range package (or packages).`,
      })

      alsoIncludePackages = Option.Array("--also", {
        description: `To pin a specific name:range that would otherwise be skipped`,
      })


      onlyWorkspaces = Option.Array("--workspace", {
        description: `To _only_ include a specific workspace (or workspaces)`,
      })

      async execute() {
        this.configuration = await Configuration.find(
          this.context.cwd,
          getPluginConfiguration()
        );

        const { project } = await Project.find(
          this.configuration,
          this.context.cwd
        );

        this.project = project;

        this.cache = await Cache.find(this.configuration);

        await this.project.resolveEverything({
          cache: this.cache,
          report: new ThrowReport(),
        });

        // this.alsoIncludePackages;
        // this.onlyWorkspaces;
        // this.onlyPackages;

        await StreamReport.start(
          {
            configuration: this.configuration,
            stdout: this.context.stdout,
            includeLogs: true,
            json: false,
          },
          async (streamReport) => {
            this.log = streamReport;
            this.gatherWorkspaces();
            this.createLocatorsByIdentMap();
            await this.findPinnableDependencies();
            await this.pinDependencies();
          }
        );
      }

      createLocatorsByIdentMap() {
        const locatorsByIdent = new Map();
        for (const [
          descriptorHash,
          locatorHash,
        ] of this.project.storedResolutions.entries()) {
          const value = locatorHash;

          const descriptor = this.project.storedDescriptors.get(descriptorHash);
          const key = descriptor.identHash;

          const locators = locatorsByIdent.get(key);
          if (locators === undefined) {
            locatorsByIdent.set(key, new Set([value]));
          } else {
            locatorsByIdent.set(key, locators.add(value));
          }
        }

        this.locatorsByIdent = locatorsByIdent;

        return this.locatorsByIdent;
      }

      gatherWorkspaces() {
        let shouldCheckAllWorkspaces =
          !this.onlyWorkspaces || this.onlyWorkspaces.length === 0;

        this.workspaces = shouldCheckAllWorkspaces
          ? this.project.workspaces
          : this.project.workspaces.filter((workspace) => {
              let possibleWorkspaceRefs = [
                workspace.cwd,
                workspace.relativeCwd,
                workspace.manifest?.name?.name,
              ].filter((pwr) => !!pwr);

              let include = this.onlyWorkspaces.some((givenWorkspaceRef) =>
                possibleWorkspaceRefs.includes(givenWorkspaceRef)
              );

              if (include) {
                this.log.reportWarning(
                  `gatherWorkspaces`,
                  `${green(`✓`)} Including workspace ${
                    workspace.manifest.name.name
                  } at ${workspace.cwd}`
                );
              } else {
                this.logVerboseWarning(
                  `gatherWorkspaces`,
                  `${yellow(`x`)} Excluding workspace ${
                    workspace.manifest.name.name
                  }, no match for ${possibleWorkspaceRefs
                    .map((r) => `'${r}'`)
                    .join(" or ")}`
                );
              }

              return include;
            });

        return this.workspaces;
      }

      async pinDependencies() {
        this.log.reportJson({
          type: `info`,
          name: `pinnableDependencies`,
          displayName: `pinnableDependencies`,
          data: this.pinnableJSON,
        });

        for (const workspace of this.workspaces) {
          const { manifest, cwd: workspaceCwd } = workspace;
          const manifestPath = ppath.join(workspaceCwd, Manifest.fileName);
          const needsPinning = this.pinnableByWorkspaceCwd.get(workspaceCwd);

          let numPinned = 0;
          for (const [identHash, { version }] of needsPinning) {
            // May cause unpredictable behavior if a package is both dependency and devDependency
            let curDependency = manifest.dependencies.get(identHash);
            let curDevDependency = manifest.devDependencies.get(identHash);

            // note that curValue will be mutated when applying changes
            let curValue = curDependency ?? curDevDependency;

            // do not mutate oldValue. if typescript, would use readonly
            // (makes copy for name,scope,range – YMMV for other properties)
            const oldValue = { ...curValue };

            // let curPkgRef = highlight => pRef({ ...oldValue }, {highlight})

            if (curDependency && curDevDependency) {
              this.log.reportWarning(
                `${manifestPath}`,
                `Possible package.json conflict between devDependencies and dependencies in ${curValue.name}`
              );
            }

            if (curValue.range === version) {
              continue;
            }

            const newDependency = Object.assign(curValue, {
              range: version,
            });

            if (curDependency) {
              manifest.dependencies.set(identHash, newDependency);
            } else if (curDevDependency) {
              manifest.devDependencies.set(identHash, newDependency);
            }

            this.log.reportInfo(
              `${manifestPath}`,
              `${green(`→`)} Pin ${pRef(oldValue, {
                highlight: { range: yellow },
              })} → ${pRef(newDependency, {
                highlight: { range: green },
              })}`
            );

            numPinned = numPinned + 1;
          }

          let needsPersist = numPinned > 0;

          if (needsPersist) {
            if (!this.dryRun) {
              await workspace.persistManifest();
              // console.log("(persist)");
            }

            this.log.reportInfo(
              `${manifestPath}`,
              `${green(`✓`)} Pinned ${numPinned} and ${
                this.dryRun ? `saved[DRY RUN]` : "saved"
              } to ${manifestPath}`
            );
          }
        }
      }

      // really should not be rolling our own here, but easier for specific use case
      static referencesPackage(refPkg, { scope, name, range }) {
        let candidatePkg = pRef({ scope, name, range });

        let exactMatch = refPkg === candidatePkg;
        let rangeMatch = [`:${range}`, `*:${range}`].includes(refPkg);

        return exactMatch || rangeMatch;
      }

      isDependencyExplicitlyIncluded({ scope, name, range }) {
        let included = (this.alsoIncludePackages ?? []).some((includeRef) =>
          PinDepsCommand.referencesPackage(includeRef, { scope, name, range })
        );
        let selected = (this.onlyPackages ?? []).some((selectRef) =>
          PinDepsCommand.referencesPackage(selectRef, { scope, name, range })
        );

        return included || selected;
      }

      logVerboseWarning(prefix, msg) {
        if (!this.verbose) {
          return;
        }

        return this.log.reportWarning(prefix, msg);
      }

      logVerboseInfo(prefix, msg) {
        if (!this.verbose) {
          return;
        }

        return this.log.reportInfo(prefix, msg);
      }

      async findPinnableDependencies() {
        this.pinnableByWorkspaceCwd = new Map();

        // simplified version of pinnableByWorkspaceCwd, for reporting
        // name:range -> version
        this.reportablePinsByWorkspaceCwd = new Map();

        for (let {
          manifest: { dependencies, devDependencies },
          cwd: workspaceCwd,
        } of this.workspaces) {
          let pinnableInWorkspace = new Map();
          this.pinnableByWorkspaceCwd.set(workspaceCwd, pinnableInWorkspace);

          let reportablePinsInWorkspace = new Map();
          this.reportablePinsByWorkspaceCwd.set(
            workspaceCwd,
            reportablePinsInWorkspace
          );

          // Process regular dependencies
          if (!this.onlyDevDependencies) {
            for (const [identHash, dependency] of dependencies) {
              this.processDependency([identHash, dependency], {
                workspaceCwd,
                pinnableInWorkspace,
                reportablePinsInWorkspace,
                isDevDependency: false,
              });
            }
          }

          // Process devDependencies
          if (this.onlyDevDependencies || !this.ignoreDevDependencies) {
            for (const [identHash, dependency] of devDependencies) {
              this.processDependency([identHash, dependency], {
                workspaceCwd,
                pinnableInWorkspace,
                reportablePinsInWorkspace,
                isDevDependency: true,
              });
            }
          }
        }
      }

      processDependency([identHash, dependency], opts) {
        const {
          workspaceCwd,
          pinnableInWorkspace,
          reportablePinsInWorkspace,
          isDevDependency = false,
        } = opts;

        const { scope, name, range } = dependency;
        const depPkgRef = pRef({ scope, name, range });
        let explicitlyIncluded = this.isDependencyExplicitlyIncluded({
          name,
          range,
        });

        if (!PinDepsCommand.needsPin(range)) {
          if (explicitlyIncluded) {
            this.logVerboseInfo(`${workspaceCwd}`, `Include: ${depPkgRef}`);
          } else {
            this.logVerboseWarning(`${workspaceCwd}`, `Skip: ${depPkgRef}`);
          }

          if (!explicitlyIncluded) {
            return;
          }
        }

        if (this.onlyPackages && !this.onlyPackages.includes(depPkgRef)) {
          this.logVerboseWarning(`${workspaceCwd}`, `Omit: ${depPkgRef}`);
          return;
        }

        const semverMatch = range.match(/^(.*)$/);

        // Adapt logic for package locator lookup from deduplicate plugin:
        // https://github.com/yarnplugins/yarn-plugin-deduplicate

        const locatorHashes = this.locatorsByIdent.get(identHash);

        let pinTo;
        if (locatorHashes !== undefined && locatorHashes.size > 1) {
          const candidates = Array.from(locatorHashes)
            .map((locatorHash) => {
              const pkg = this.project.storedPackages.get(locatorHash);
              if (pkg === undefined) {
                throw new TypeError(
                  `Can't find package for locator hash '${locatorHash}'`
                );
              }
              if (structUtils.isVirtualLocator(pkg)) {
                const sourceLocator = structUtils.devirtualizeLocator(pkg);
                return this.project.storedPackages.get(
                  sourceLocator.locatorHash
                );
              }

              return pkg;
            })
            .filter((sourcePackage) => {
              if (sourcePackage.version === null) return false;

              return explicitlyIncluded
                ? true
                : semverMatch === null
                ? false
                : semver.satisfies(sourcePackage.version, semverMatch[1]);
            })
            .sort((a, b) => {
              return explicitlyIncluded
                ? -1
                : semver.gt(a.version, b.version)
                ? -1
                : 1;
            });

          if (candidates.length > 1) {
            // https://stackoverflow.com/questions/22566379
            const candidatePairs = candidates
              .map((v, i) => candidates.slice(i + 1).map((w) => [v, w]))
              .flat();

            let numDupes = 0;
            for (let [candidateA, candidateB] of candidatePairs) {
              if (!structUtils.areLocatorsEqual(candidateA, candidateB)) {
                numDupes = numDupes + 1;
              }
            }

            if (numDupes > 0) {
              this.log.reportWarningOnce(
                `${workspaceCwd}`,
                `Possible duplicate: ${depPkgRef} has ${candidates.length} candidates (${numDupes} conflicting pairs)`
              );
            }
          }

          pinTo = this.project.storedPackages.get(candidates[0].locatorHash);
        } else if (locatorHashes.size === 1) {
          pinTo = this.project.storedPackages.get(Array.from(locatorHashes)[0]);
        } else {
          this.log.reportWarning(
            `${workspaceCwd}`,
            `Missing locator: ${depPkgRef}`
          );
        }

        if (pinTo.version === range) {
          if (explicitlyIncluded) {
            this.log.reportInfo(`${yellow("-")} Already pinned: ${depPkgRef}`);
          } else {
            this.logVerboseWarning(
              `${workspaceCwd}`,
              `already pinned ${depPkgRef} to ${pinTo.version}`
            );
          }
        } else {
          pinnableInWorkspace.set(identHash, pinTo);
          reportablePinsInWorkspace.set(depPkgRef, pinTo.version);

          this.logVerboseInfo(
            `${workspaceCwd}`,
            `will pin ${depPkgRef} to ${pinTo.version} in ${workspaceCwd}`
          );
        }
      }

      get pinnableJSON() {
        // https://stackoverflow.com/questions/57611237
        const toObject = (map = new Map()) =>
          Object.fromEntries(
            Array.from(map.entries(), ([k, v]) =>
              v instanceof Map ? [k, toObject(v)] : [k, v]
            )
          );

        return toObject(this.reportablePinsByWorkspaceCwd);
      }

      static needsPin(range) {
        if (!semverUtils.validRange(range)) {
          return false;
        }

        return true;
      }
    }

    // Show descriptive usage for a --help argument passed to this command
    PinDepsCommand.usage = Command.Usage({
      description: `pin-deps [--dry] [--include name:range]`,
      details: `
        Pin any unpinned dependencies to their currently resolved version.
        Pass \`--dry\` for a dry-run. Otherwise, write changes to \`package.json\`
        files directly. You will still need to \`yarn install\` for the changes
        to take effect.
        Search all workspaces by default. Pass \`--workspace\` flag(s) to focus
        on one or multiple workspace(s).
        Search all packages with semver range references by default. To include
        otherwise skipped packages, specify \`--include name:range\`. To focus
        only on specific package(s), specify \`--only name:range\`
      `,
      examples: [
        [
          `Update package.json in every workspace, to pin all packages with
          semver range to their currently resolved version.`,
          `$0 pin-deps`,
        ],
        [
          `Perform a "dry run" – do not apply any changes to files, but otherwise
          run command as normally.`,
          `$0 pin-deps --dry`,
        ],
        [
          `Include (do not skip) any packages with reference next:canary`,
          `$0 pin-deps --include next:canary`,
        ],
        [
          `Include any package with range \`canary\` (not a regex, only works for this syntax)`,
          `$0 pin-deps --include :canary`,
        ],
        [
          `Include _only_ packages with reference next:canary or material-ui/core:latest`,
          `$0 pin-deps --only next:canary --only material-ui/core:latest`,
        ],
        [
          `Include _only_ workspaces by matching one of workspace.name, workspace.cwd, or workspace.relativeCwd`,
          `$0 pin-deps --workspace acmeco/design --workspace acmeco/auth`,
        ],
        [
          `Ignore devDependencies (pin only regular dependencies)`,
          `$0 pin-deps --ignore-dev`,
        ],
        [
          `Pin only devDependencies in acmeco/design or acmeco/components`,
          `$0 pin-deps --only-dev --workspace acmeco/design --workspace acmeco/components`,
        ],
        [
          `Hacky: print a specific package resolution (\`yarn why\` or \`yarn info\` is likely better)`,
          `$0 pin-deps --dry --workspace @acmeco/design --only next:canary`,
        ],
        [
          `Print verbose logs (including alerady pinned packages)`,
          `$0 --verbose`,
        ],
      ],
    });

    return {
      commands: [PinDepsCommand],
    };
  },
};
