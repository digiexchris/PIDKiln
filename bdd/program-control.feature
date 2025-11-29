Feature: Program Control
  As a user operating a kiln
  I want to load, start, pause, and stop firing programs
  So that I can control the firing process

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And the WebSocket is connected

  @program @load
  Scenario: Load a program from sidebar
    Given no program is currently loaded
    When I select "program1.json" from the program dropdown in the sidebar
    And I click the "Load" button in the sidebar
    Then the status bar should show "program1.json" as the loaded program
    And the status badge should show "READY"
    And the chart should display the program profile

  @program @load @programs-page
  Scenario: Load a program from Programs page
    Given I am on the Programs view
    When I click the "Load" button for "program1.json"
    Then the status bar should show "program1.json" as the loaded program
    And the status badge should show "READY"

  @program @load @disabled-while-running
  Scenario: Cannot load program while running
    Given a program is currently running
    Then the program dropdown in the sidebar should be disabled
    And the "Load" button in the sidebar should be disabled
    And all "Load" buttons on the Programs page should be disabled
    And disabled load buttons should show a "not-allowed" cursor

  @program @start
  Scenario: Start a loaded program
    Given "program1.json" is loaded
    When I click the "Start" button
    Then the status badge should show "RUNNING"
    And the Start button should become disabled
    And the Start button should change to normal button color
    And the Pause and Stop buttons should be enabled

  @program @start @disabled-while-running
  Scenario: Cannot start while already running
    Given a program is currently running
    Then the "Start" button should be disabled
    And the "Start" button should have normal button styling (not green)

  @program @pause
  Scenario: Pause a running program
    Given a program is currently running
    When I click the "Pause" button
    Then the status badge should show "PAUSED"
    And the Pause button should change to "Resume"

  @program @resume
  Scenario: Resume a paused program
    Given a program is currently paused
    When I click the "Resume" button
    Then the status badge should show "RUNNING"
    And the Resume button should change back to "Pause"

  @program @stop
  Scenario: Stop a running program
    Given a program is currently running
    When I click the "Stop" button
    Then the status badge should show "STOPPED"
    And the target temperature should reset to 0
    And the Start button should be re-enabled
    And the Start button should return to green styling
    And all Load buttons should be re-enabled

  @program @stop @danger-style
  Scenario: Stop button has danger styling
    Then the "Stop" button should have danger styling (red/warning color)

  @program @clear
  Scenario: Clear/unload a loaded program
    Given "program1.json" is loaded
    And the program is not running
    When I click the "Clear" button
    Then the status bar should show no loaded program
    And the chart should remove the program profile overlay

  @program @clear @disabled-while-running
  Scenario: Cannot clear program while running
    Given a program is currently running
    Then the "Clear" button should be disabled

  @program @manual-temp
  Scenario: Set manual target temperature
    Given no program is running
    When I enter "500" in the temperature input
    And I click the "Set" button
    Then the target temperature should be set to 500°C
    And the kiln should begin heating toward 500°C

