!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER
  !macro customFinishPage
    Function StartApp
      ${if} ${isUpdated}
        StrCpy $1 "--updated"
      ${else}
        StrCpy $1 ""
      ${endif}
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
    FunctionEnd

    Function EnableStartup
      SetShellVarContext current
      CreateShortCut "$SMSTARTUP\干啥了.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    FunctionEnd

    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
    !define MUI_FINISHPAGE_SHOWREADME
    !define MUI_FINISHPAGE_SHOWREADME_TEXT "开机启动"
    !define MUI_FINISHPAGE_SHOWREADME_FUNCTION "EnableStartup"
    !insertmacro MUI_PAGE_FINISH
  !macroend
!endif

!macro customUnInstall
  SetShellVarContext current
  Delete "$SMSTARTUP\干啥了.lnk"
!macroend
