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

  @program @execution @segments
  Scenario: Program follows segment schedule
    Given "program1.json" is loaded with multiple segments
    When I start the program
    Then the target temperature should follow the program schedule
    And during ramp phases the target should gradually change
    And during dwell phases the target should hold steady
    And the step indicator should update as segments complete

  @program @execution @ramp
  Scenario: Target temperature ramps between segments
    Given a program is running
    And the current segment has a ramp phase
    Then the target temperature should interpolate from the previous target to the current target
    And the interpolation should be linear over the ramp duration

  @program @execution @ramp @first-segment
  Scenario: First segment ramps from current kiln temperature
    Given the kiln is at 50°C
    And a program is loaded with a first segment that has a ramp time
    When I start the program
    Then the target temperature should start at 50°C
    And the target should ramp linearly to the first segment's target
    And the program profile on the chart should also start at 50°C

  @program @execution @ramp @first-segment-instant
  Scenario: First segment with zero ramp time jumps to target
    Given the kiln is at 50°C
    And a program is loaded with a first segment that has zero ramp time
    When I start the program
    Then the target temperature should immediately jump to the first segment's target
    And the program profile on the chart should show a vertical line from 50°C to the target

  @program @execution @dwell
  Scenario: Target temperature holds during dwell
    Given a program is running
    And the current segment is in the dwell phase
    Then the target temperature should hold at the segment's target temperature
    And the target should not change until the dwell time completes

  @program @execution @finish
  Scenario: Program completes when all segments finish
    Given a program is running
    When all segments have completed
    Then the status badge should show "FINISHED"
    And the target temperature should reset to 0
    And the kiln should begin cooling toward ambient temperature

  @program @execution @step-indicator
  Scenario: Step indicator tracks progress
    Given a program is running with 3 segments
    When segment 1 completes
    Then the step indicator should show "2 of 3"
    When segment 2 completes
    Then the step indicator should show "3 of 3"

